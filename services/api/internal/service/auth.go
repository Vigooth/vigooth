package service

import (
	"errors"
	"strings"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already taken")
)

type AuthService struct {
	userRepo    repository.UserRepository
	jwtSecret   string
	adminEmails map[string]struct{}
}

// NewAuthService takes the admin allowlist as emails: with no admin UI to
// promote accounts, an env var the operator edits is the whole mechanism.
func NewAuthService(userRepo repository.UserRepository, jwtSecret string, adminEmails []string) *AuthService {
	admins := make(map[string]struct{}, len(adminEmails))
	for _, e := range adminEmails {
		e = strings.ToLower(strings.TrimSpace(e))
		if e != "" {
			admins[e] = struct{}{}
		}
	}
	return &AuthService{
		userRepo:    userRepo,
		jwtSecret:   jwtSecret,
		adminEmails: admins,
	}
}

// IsAdmin is the check behind the admin routes, keyed by the token's subject.
func (s *AuthService) IsAdmin(userID string) bool {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return false
	}
	return s.isAdminEmail(user.Email)
}

func (s *AuthService) isAdminEmail(email string) bool {
	_, ok := s.adminEmails[strings.ToLower(email)]
	return ok
}

// withAdminFlag stamps the computed flag before a user leaves the service.
func (s *AuthService) withAdminFlag(user *model.User) *model.User {
	user.IsAdmin = s.isAdminEmail(user.Email)
	return user
}

func (s *AuthService) Register(req model.RegisterRequest) (*model.AuthResponse, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		ID:        uuid.New().String(),
		Email:     req.Email,
		Password:  string(hashedPassword),
		CreatedAt: time.Now(),
	}

	if err := s.userRepo.Create(user); err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			return nil, ErrEmailTaken
		}
		return nil, err
	}

	// Generate token
	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token: token,
		User:  *s.withAdminFlag(user),
	}, nil
}

func (s *AuthService) Login(req model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token: token,
		User:  *s.withAdminFlag(user),
	}, nil
}

// GetUser resolves the account behind an already-validated token.
//
// It exists so a frontend can ask "whose cookie is this?" on boot. The auth
// cookie is scoped to the whole domain, so every app receives it — but each app's
// localStorage is per-origin, so without this they cannot tell an active session
// from no session and have to show a login form regardless.
func (s *AuthService) GetUser(userID string) (*model.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	return s.withAdminFlag(user), nil
}

func (s *AuthService) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"typ": "user",
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}
