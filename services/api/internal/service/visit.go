package service

import (
	"context"
	"errors"
	"log"
	"net"
	"sync"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/google/uuid"
)

const (
	defaultVisitLimit = 50
	maxVisitLimit     = 500
)

var ErrInvalidIP = errors.New("invalid ip filter")

type VisitService struct {
	repo     repository.VisitRepository
	userRepo repository.UserRepository
	geoip    *GeoIPClient

	// Addresses with a lookup in flight. Two beacons from a new address landing
	// together would otherwise both miss the cache and both call the provider.
	mu       sync.Mutex
	inFlight map[string]struct{}
}

func NewVisitService(repo repository.VisitRepository, userRepo repository.UserRepository, geoip *GeoIPClient) *VisitService {
	return &VisitService{repo: repo, userRepo: userRepo, geoip: geoip, inFlight: make(map[string]struct{})}
}

// Record stores the hit and, off the request path, geolocates its address the
// first time it is seen. The beacon answers before the provider does: nothing
// the browser is waiting on depends on where the visitor is.
//
// userID is "" for an anonymous visit. A token for an account that no longer
// exists is recorded as anonymous rather than refused: the hit still happened.
func (s *VisitService) Record(req model.TrackRequest, ip, userAgent, userID string) error {
	visit := &model.Visit{
		ID:        uuid.New().String(),
		IP:        ip,
		App:       req.App,
		Path:      req.Path,
		Referrer:  req.Referrer,
		UserAgent: userAgent,
		UserEmail: s.emailOf(userID),
		CreatedAt: time.Now(),
	}
	if err := s.repo.Create(visit); err != nil {
		return err
	}
	go s.ensureLocation(ip)
	return nil
}

func (s *VisitService) emailOf(userID string) string {
	if userID == "" {
		return ""
	}
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return ""
	}
	return user.Email
}

func (s *VisitService) ensureLocation(ip string) {
	if !IsPublicIP(ip) {
		return
	}
	if _, err := s.repo.GetLocation(ip); err == nil {
		return
	} else if !errors.Is(err, repository.ErrLocationNotFound) {
		log.Printf("geoip: cache read failed for %s: %v", ip, err)
		return
	}

	s.mu.Lock()
	if _, busy := s.inFlight[ip]; busy {
		s.mu.Unlock()
		return
	}
	s.inFlight[ip] = struct{}{}
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		delete(s.inFlight, ip)
		s.mu.Unlock()
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	loc, err := s.geoip.Lookup(ctx, ip)
	if err != nil {
		// Transport trouble: leave no row, so the next hit from this address
		// retries instead of freezing the failure.
		log.Printf("geoip: lookup failed for %s: %v", ip, err)
		return
	}
	if err := s.repo.SaveLocation(loc); err != nil {
		log.Printf("geoip: cache write failed for %s: %v", ip, err)
	}
}

func (s *VisitService) List(filter model.VisitFilter) ([]model.Visit, error) {
	// Postgres would reject a malformed inet with a 500-shaped error; say 400.
	if filter.IP != "" && net.ParseIP(filter.IP) == nil {
		return nil, ErrInvalidIP
	}
	if filter.Limit <= 0 {
		filter.Limit = defaultVisitLimit
	}
	if filter.Limit > maxVisitLimit {
		filter.Limit = maxVisitLimit
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}
	return s.repo.List(filter)
}

func (s *VisitService) ListVisitors(limit, offset int) ([]model.Visitor, error) {
	if limit <= 0 {
		limit = defaultVisitLimit
	}
	if limit > maxVisitLimit {
		limit = maxVisitLimit
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.ListVisitors(limit, offset)
}

func (s *VisitService) Stats() (*model.VisitStats, error) {
	return s.repo.Stats(time.Now())
}
