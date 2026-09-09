package repository

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
)

var ErrLocationNotFound = errors.New("ip location not found")

type VisitRepository interface {
	Create(visit *model.Visit) error
	// List returns visits newest first, each joined with its IP's location when
	// one is known.
	List(filter model.VisitFilter) ([]model.Visit, error)
	Stats(now time.Time) (*model.VisitStats, error)
	// ListVisitors groups visits by address, most recently seen first.
	ListVisitors(limit, offset int) ([]model.Visitor, error)

	GetLocation(ip string) (*model.IPLocation, error)
	// SaveLocation upserts: a retried lookup overwrites the failed row.
	SaveLocation(location *model.IPLocation) error
}

// InMemoryVisitRepository backs the no-database dev mode.
type InMemoryVisitRepository struct {
	mu        sync.RWMutex
	visits    []model.Visit
	locations map[string]*model.IPLocation
}

func NewInMemoryVisitRepository() *InMemoryVisitRepository {
	return &InMemoryVisitRepository{locations: make(map[string]*model.IPLocation)}
}

func (r *InMemoryVisitRepository) Create(visit *model.Visit) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	copied := *visit
	copied.Location = nil
	r.visits = append(r.visits, copied)
	return nil
}

func (r *InMemoryVisitRepository) List(filter model.VisitFilter) ([]model.Visit, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	matching := make([]model.Visit, 0, len(r.visits))
	for _, v := range r.visits {
		if filter.App != "" && v.App != filter.App {
			continue
		}
		if filter.IP != "" && v.IP != filter.IP {
			continue
		}
		matching = append(matching, v)
	}
	sort.Slice(matching, func(i, j int) bool { return matching[i].CreatedAt.After(matching[j].CreatedAt) })

	if filter.Offset >= len(matching) {
		return []model.Visit{}, nil
	}
	matching = matching[filter.Offset:]
	if filter.Limit > 0 && len(matching) > filter.Limit {
		matching = matching[:filter.Limit]
	}

	for i := range matching {
		if loc, ok := r.locations[matching[i].IP]; ok && loc.Resolved {
			copied := *loc
			matching[i].Location = &copied
		}
	}
	return matching, nil
}

func (r *InMemoryVisitRepository) ListVisitors(limit, offset int) ([]model.Visitor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	byIP := make(map[string]*model.Visitor)
	apps := make(map[string]map[string]struct{})
	accounts := make(map[string]map[string]struct{})
	for _, v := range r.visits {
		visitor, ok := byIP[v.IP]
		if !ok {
			visitor = &model.Visitor{IP: v.IP, FirstSeen: v.CreatedAt, LastSeen: v.CreatedAt}
			byIP[v.IP] = visitor
			apps[v.IP] = make(map[string]struct{})
			accounts[v.IP] = make(map[string]struct{})
		}
		visitor.Visits++
		if v.CreatedAt.Before(visitor.FirstSeen) {
			visitor.FirstSeen = v.CreatedAt
		}
		if v.CreatedAt.After(visitor.LastSeen) {
			visitor.LastSeen = v.CreatedAt
		}
		apps[v.IP][v.App] = struct{}{}
		if v.UserEmail != "" {
			accounts[v.IP][v.UserEmail] = struct{}{}
		}
	}

	visitors := make([]model.Visitor, 0, len(byIP))
	for ip, visitor := range byIP {
		visitor.Apps = sortedKeys(apps[ip])
		visitor.Accounts = sortedKeys(accounts[ip])
		if loc, ok := r.locations[ip]; ok && loc.Resolved {
			copied := *loc
			visitor.Location = &copied
		}
		visitors = append(visitors, *visitor)
	}
	sort.Slice(visitors, func(i, j int) bool { return visitors[i].LastSeen.After(visitors[j].LastSeen) })

	if offset >= len(visitors) {
		return []model.Visitor{}, nil
	}
	visitors = visitors[offset:]
	if limit > 0 && len(visitors) > limit {
		visitors = visitors[:limit]
	}
	return visitors, nil
}

func sortedKeys(set map[string]struct{}) []string {
	keys := make([]string, 0, len(set))
	for k := range set {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func (r *InMemoryVisitRepository) Stats(now time.Time) (*model.VisitStats, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekAgo := now.Add(-7 * 24 * time.Hour)
	monthAgo := now.Add(-30 * 24 * time.Hour)

	stats := &model.VisitStats{
		ByCountry30d: []model.CountBucket{},
		ByApp30d:     []model.CountBucket{},
	}
	uniqueIPs := make(map[string]struct{})
	byCountry := make(map[string]int)
	byApp := make(map[string]int)

	for _, v := range r.visits {
		stats.Total++
		if !v.CreatedAt.Before(startOfDay) {
			stats.Today++
		}
		if v.CreatedAt.After(weekAgo) {
			stats.Last7Days++
			uniqueIPs[v.IP] = struct{}{}
		}
		if v.CreatedAt.After(monthAgo) {
			byApp[v.App]++
			country := ""
			if loc, ok := r.locations[v.IP]; ok && loc.Resolved {
				country = loc.Country
			}
			byCountry[country]++
		}
	}
	stats.UniqueIPs7d = len(uniqueIPs)
	stats.ByCountry30d = topBuckets(byCountry, 10)
	stats.ByApp30d = topBuckets(byApp, 10)
	return stats, nil
}

func topBuckets(counts map[string]int, limit int) []model.CountBucket {
	buckets := make([]model.CountBucket, 0, len(counts))
	for k, n := range counts {
		buckets = append(buckets, model.CountBucket{Key: k, Count: n})
	}
	sort.Slice(buckets, func(i, j int) bool {
		if buckets[i].Count != buckets[j].Count {
			return buckets[i].Count > buckets[j].Count
		}
		return strings.Compare(buckets[i].Key, buckets[j].Key) < 0
	})
	if len(buckets) > limit {
		buckets = buckets[:limit]
	}
	return buckets
}

func (r *InMemoryVisitRepository) GetLocation(ip string) (*model.IPLocation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	loc, ok := r.locations[ip]
	if !ok {
		return nil, ErrLocationNotFound
	}
	copied := *loc
	return &copied, nil
}

func (r *InMemoryVisitRepository) SaveLocation(location *model.IPLocation) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	copied := *location
	r.locations[location.IP] = &copied
	return nil
}
