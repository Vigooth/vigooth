package model

import "time"

type User struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	Password      string    `json:"-"`            // Hashed, never sent to client
	TotpSecret    string    `json:"-"`            // TOTP secret, never sent to client
	TotpEnabled   bool      `json:"totp_enabled"` // Whether 2FA is active
	RecoveryCodes string    `json:"-"`            // JSON array of bcrypt-hashed recovery codes
	CreatedAt     time.Time `json:"created_at"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token        string `json:"token"`
	User         User   `json:"user"`
	TotpRequired bool   `json:"totp_required,omitempty"`
}

type TotpVerifyRequest struct {
	Code     string `json:"code"`
	Recovery string `json:"recovery"`
}

type TotpSetupResponse struct {
	Secret        string   `json:"secret"`
	QRCodeURI     string   `json:"qr_code_uri"`
	RecoveryCodes []string `json:"recovery_codes,omitempty"`
}

type TotpStatusResponse struct {
	Enabled bool `json:"enabled"`
}
