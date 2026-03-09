package main

import (
	"log"
	"os"

	"github.com/Vigooth/vigooth/services/api/internal/handler"
	"github.com/Vigooth/vigooth/services/api/internal/middleware"
	"github.com/Vigooth/vigooth/services/api/internal/repository"
	"github.com/Vigooth/vigooth/services/api/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	// Config
	port := getEnv("PORT", "8080")
	jwtSecret := getEnv("JWT_SECRET", "dev-secret-change-in-production")
	tmdbApiKey := os.Getenv("TMDB_API_KEY")
	omdbApiKey := os.Getenv("OMDB_API_KEY")
	databaseURL := os.Getenv("DATABASE_URL")

	// Dependencies
	var vaultRepo repository.VaultRepository
	var userRepo repository.UserRepository
	var movieRepo repository.MovieRepository

	if databaseURL != "" {
		// PostgreSQL mode
		log.Println("Connecting to PostgreSQL...")
		pool, err := repository.NewPostgresPool(databaseURL)
		if err != nil {
			log.Fatalf("Failed to connect to database: %v", err)
		}
		defer pool.Close()
		log.Println("Connected to PostgreSQL")

		vaultRepo = repository.NewPostgresVaultRepository(pool)
		userRepo = repository.NewPostgresUserRepository(pool)
		movieRepo = repository.NewPostgresMovieRepository(pool)
	} else {
		// In-memory mode (development)
		log.Println("Running in-memory mode (no DATABASE_URL set)")
		vaultRepo = repository.NewInMemoryVaultRepository()
		userRepo = repository.NewInMemoryUserRepository()
		movieRepo = repository.NewInMemoryMovieRepository()
	}

	vaultService := service.NewVaultService(vaultRepo)
	movieService := service.NewMovieService(movieRepo)
	authService := service.NewAuthService(userRepo, jwtSecret)

	vaultHandler := handler.NewVaultHandler(vaultService)
	movieHandler := handler.NewMovieHandler(movieService)
	proxyHandler := handler.NewProxyHandler(tmdbApiKey, omdbApiKey)
	authHandler := handler.NewAuthHandler(authService)

	authMiddleware := middleware.NewAuthMiddleware(jwtSecret)

	// Router
	r := gin.Default()

	// CORS
	r.Use(middleware.CORS())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Auth routes
	r.POST("/auth/register", authHandler.Register)
	r.POST("/auth/login", authHandler.Login)

	// Protected routes
	api := r.Group("/api")
	api.Use(authMiddleware.RequireAuth())
	{
		api.GET("/vault", vaultHandler.GetVault)
		api.PUT("/vault", vaultHandler.SaveVault)
		api.DELETE("/vault", vaultHandler.DeleteVault)

		api.GET("/movies", movieHandler.GetMovies)
		api.GET("/movies/:id", movieHandler.GetMovie)
		api.POST("/movies", movieHandler.AddMovie)
		api.PUT("/movies/:id", movieHandler.UpdateMovie)
		api.DELETE("/movies/:id", movieHandler.DeleteMovie)

		api.GET("/tmdb/search", proxyHandler.TmdbSearch)
		api.GET("/tmdb/movie/:id", proxyHandler.TmdbMovieDetail)
		api.GET("/tmdb/movie/:id/credits", proxyHandler.TmdbMovieCredits)
		api.GET("/omdb", proxyHandler.OmdbRatings)
		api.GET("/allocine/ratings", proxyHandler.AllocineRatings)
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
