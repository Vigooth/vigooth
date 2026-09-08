package model

import "time"

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Hashed, never sent to client
	CreatedAt time.Time `json:"created_at"`
	// Not stored: set from the ADMIN_EMAILS allowlist whenever the account is
	// read, so it is the frontend's cue to show the admin space.
	IsAdmin bool `json:"is_admin"`
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
	Token string `json:"token"`
	User  User   `json:"user"`
}
