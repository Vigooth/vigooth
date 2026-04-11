package service

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/Vigooth/vigooth/services/api/internal/model"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already taken")
	ErrInvalidTotpCode    = errors.New("invalid totp code")
	ErrTotpAlreadyEnabled = errors.New("totp already enabled")
	ErrTotpNotEnabled     = errors.New("totp not enabled")
	ErrTotpNotSetup       = errors.New("totp not set up")
)

type AuthService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
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
		User:  *user,
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

	if user.TotpEnabled {
		pendingToken, err := s.generatePendingTotpToken(user.ID)
		if err != nil {
			return nil, err
		}
		return &model.AuthResponse{
			Token:        pendingToken,
			User:         *user,
			TotpRequired: true,
		}, nil
	}

	token, err := s.generateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *AuthService) SetupTotp(userID string) (*model.TotpSetupResponse, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.TotpEnabled {
		return nil, ErrTotpAlreadyEnabled
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Vilock",
		AccountName: user.Email,
	})
	if err != nil {
		return nil, err
	}

	if err := s.userRepo.UpdateTotpSecret(userID, key.Secret()); err != nil {
		return nil, err
	}

	return &model.TotpSetupResponse{
		Secret:    key.Secret(),
		QRCodeURI: key.URL(),
	}, nil
}

func (s *AuthService) EnableTotp(userID string, code string) ([]string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if user.TotpEnabled {
		return nil, ErrTotpAlreadyEnabled
	}
	if user.TotpSecret == "" {
		return nil, ErrTotpNotSetup
	}

	if !totp.Validate(code, user.TotpSecret) {
		return nil, ErrInvalidTotpCode
	}

	codes, err := generateRecoveryCodes(8)
	if err != nil {
		return nil, err
	}

	hashedCodes := make([]string, len(codes))
	for i, c := range codes {
		h, err := bcrypt.GenerateFromPassword([]byte(c), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		hashedCodes[i] = string(h)
	}

	codesJSON, err := json.Marshal(hashedCodes)
	if err != nil {
		return nil, err
	}

	if err := s.userRepo.EnableTotp(userID, string(codesJSON)); err != nil {
		return nil, err
	}

	return codes, nil
}

func (s *AuthService) VerifyTotpLogin(userID string, req model.TotpVerifyRequest) (string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", err
	}
	if !user.TotpEnabled {
		return "", ErrTotpNotEnabled
	}

	if req.Code != "" {
		if !totp.Validate(req.Code, user.TotpSecret) {
			return "", ErrInvalidTotpCode
		}
		return s.generateToken(userID)
	}

	if req.Recovery != "" {
		var hashedCodes []string
		if err := json.Unmarshal([]byte(user.RecoveryCodes), &hashedCodes); err != nil {
			return "", err
		}

		matchIdx := -1
		for i, h := range hashedCodes {
			if bcrypt.CompareHashAndPassword([]byte(h), []byte(req.Recovery)) == nil {
				matchIdx = i
				break
			}
		}
		if matchIdx == -1 {
			return "", ErrInvalidTotpCode
		}

		// Remove used recovery code
		hashedCodes = append(hashedCodes[:matchIdx], hashedCodes[matchIdx+1:]...)
		updatedJSON, err := json.Marshal(hashedCodes)
		if err != nil {
			return "", err
		}
		if err := s.userRepo.UpdateRecoveryCodes(userID, string(updatedJSON)); err != nil {
			return "", err
		}

		return s.generateToken(userID)
	}

	return "", ErrInvalidTotpCode
}

func (s *AuthService) DisableTotp(userID string, code string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}
	if !user.TotpEnabled {
		return ErrTotpNotEnabled
	}

	if !totp.Validate(code, user.TotpSecret) {
		return ErrInvalidTotpCode
	}

	return s.userRepo.DisableTotp(userID)
}

func (s *AuthService) GetTotpStatus(userID string) (bool, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return false, err
	}
	return user.TotpEnabled, nil
}

func (s *AuthService) GetUser(userID string) (*model.User, error) {
	return s.userRepo.FindByID(userID)
}

func (s *AuthService) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AuthService) generatePendingTotpToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub":     userID,
		"purpose": "totp_pending",
		"exp":     time.Now().Add(5 * time.Minute).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func generateRecoveryCodes(count int) ([]string, error) {
	codes := make([]string, count)
	for i := range codes {
		b := make([]byte, 4)
		if _, err := rand.Read(b); err != nil {
			return nil, err
		}
		codes[i] = fmt.Sprintf("%x-%x", b[:2], b[2:])
	}
	return codes, nil
}
