package model

import "time"

// Vault stores the encrypted data - server never sees decrypted content
type Vault struct {
	UserID    string    `json:"user_id"`
	Data      string    `json:"data"`       // Encrypted blob from client
	UpdatedAt time.Time `json:"updated_at"`
}

type SaveVaultRequest struct {
	Data string `json:"data" binding:"required"` // Encrypted data from client
}

type VaultResponse struct {
	Data      string    `json:"data"`
	UpdatedAt time.Time `json:"updated_at"`
}
