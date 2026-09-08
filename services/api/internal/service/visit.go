package service

import (
	"context"
	"errors"
	"log"
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

type VisitService struct {
	repo  repository.VisitRepository
	geoip *GeoIPClient

	// Addresses with a lookup in flight. Two beacons from a new address landing
	// together would otherwise both miss the cache and both call the provider.
	mu       sync.Mutex
	inFlight map[string]struct{}
}

func NewVisitService(repo repository.VisitRepository, geoip *GeoIPClient) *VisitService {
	return &VisitService{repo: repo, geoip: geoip, inFlight: make(map[string]struct{})}
}

// Record stores the hit and, off the request path, geolocates its address the
// first time it is seen. The beacon answers before the provider does: nothing
// the browser is waiting on depends on where the visitor is.
func (s *VisitService) Record(req model.TrackRequest, ip, userAgent string) error {
	visit := &model.Visit{
		ID:        uuid.New().String(),
		IP:        ip,
		App:       req.App,
		Path:      req.Path,
		Referrer:  req.Referrer,
		UserAgent: userAgent,
		CreatedAt: time.Now(),
	}
	if err := s.repo.Create(visit); err != nil {
		return err
	}
	go s.ensureLocation(ip)
	return nil
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

func (s *VisitService) Stats() (*model.VisitStats, error) {
	return s.repo.Stats(time.Now())
}
