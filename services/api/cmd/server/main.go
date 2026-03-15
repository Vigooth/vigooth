package main

import (
	"log"
	"os"

	"github.com/Vigooth/vigooth/services/api/internal/handler"
	"github.com/Vigooth/vigooth/services/api/internal/llm"
	"github.com/Vigooth/vigooth/services/api/internal/middleware"
	"github.com/Vigooth/vigooth/services/api/internal/model"
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

	wishlistRepo := repository.NewInMemoryWishlistRepository()

	vaultService := service.NewVaultService(vaultRepo)
	movieService := service.NewMovieService(movieRepo)
	wishlistService := service.NewWishlistService(wishlistRepo)
	authService := service.NewAuthService(userRepo, jwtSecret)

	vaultHandler := handler.NewVaultHandler(vaultService)
	movieHandler := handler.NewMovieHandler(movieService)
	wishlistHandler := handler.NewWishlistHandler(wishlistService)
	proxyHandler := handler.NewProxyHandler(tmdbApiKey, omdbApiKey)
	authHandler := handler.NewAuthHandler(authService)

	// Recommendation history
	recoRepo := repository.NewInMemoryRecommendationRepository()

	// LLM provider (optional - recommendations feature)
	var recoHandler *handler.RecommendationHandler
	if os.Getenv("LLM_API_KEY") != "" {
		llmProvider, err := llm.NewProviderFromEnv()
		if err != nil {
			log.Printf("Warning: LLM provider init failed: %v (recommendations disabled)", err)
		} else {
			recoHandler = handler.NewRecommendationHandler(movieService, wishlistService, llmProvider, tmdbApiKey, recoRepo)
			log.Printf("LLM provider initialized: %s", getEnv("LLM_PROVIDER", "anthropic"))
		}
	}

	// Seed dev user + movies in-memory mode
	if databaseURL == "" {
		seedDevData(authService, movieService)
	}

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

		api.GET("/wishlist", wishlistHandler.GetWishlist)
		api.POST("/wishlist", wishlistHandler.AddToWishlist)
		api.DELETE("/wishlist/:tmdbId", wishlistHandler.RemoveFromWishlist)

		api.GET("/tmdb/search", proxyHandler.TmdbSearch)
		api.GET("/tmdb/search-person", proxyHandler.TmdbSearchPerson)
		api.GET("/tmdb/discover/movie", proxyHandler.TmdbDiscoverByPerson)
		api.GET("/tmdb/movie/:id", proxyHandler.TmdbMovieDetail)
		api.GET("/tmdb/movie/:id/credits", proxyHandler.TmdbMovieCredits)
		api.GET("/omdb", proxyHandler.OmdbRatings)
		api.GET("/allocine/ratings", proxyHandler.AllocineRatings)

		if recoHandler != nil {
			api.POST("/recommendations/stream", recoHandler.StreamRecommendations)
			api.GET("/recommendations/history", recoHandler.GetHistory)
		}
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func seedDevData(authService *service.AuthService, movieService *service.MovieService) {
	resp, err := authService.Register(model.RegisterRequest{
		Email:    "t@t.com",
		Password: "dev12345",
	})
	if err != nil {
		log.Printf("Seed: user already exists or error: %v", err)
		return
	}

	userID := resp.User.ID
	log.Printf("Seed: created dev user (email: t@t.com, password: dev12345)")

	r8 := 8
	r9 := 9
	r7 := 7
	r10 := 10

	movies := []model.AddMovieRequest{
		{TmdbID: 141, Title: "Donnie Darko", OriginalTitle: "Donnie Darko", Year: 2001, Genres: "Drame, Science-Fiction, Thriller", Director: "Richard Kelly", PosterPath: "/fBO3rSMQOgaRTkBzVMqbTB1Ls3w.jpg", PersonalRating: &r9},
		{TmdbID: 550, Title: "Fight Club", OriginalTitle: "Fight Club", Year: 1999, Genres: "Drame, Thriller", Director: "David Fincher", PosterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", PersonalRating: &r10},
		{TmdbID: 77, Title: "Memento", OriginalTitle: "Memento", Year: 2000, Genres: "Thriller, Mystère", Director: "Christopher Nolan", PosterPath: "/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg", PersonalRating: &r9},
		{TmdbID: 680, Title: "Pulp Fiction", OriginalTitle: "Pulp Fiction", Year: 1994, Genres: "Thriller, Crime", Director: "Quentin Tarantino", PosterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", PersonalRating: &r10},
		{TmdbID: 807, Title: "Seven", OriginalTitle: "Se7en", Year: 1995, Genres: "Crime, Mystère, Thriller", Director: "David Fincher", PosterPath: "/6yoghtyTpznpBik8EngEmJskVUO.jpg", PersonalRating: &r8},
		{TmdbID: 137113, Title: "Edge of Tomorrow", OriginalTitle: "Edge of Tomorrow", Year: 2014, Genres: "Action, Science-Fiction", Director: "Doug Liman", PosterPath: "/xjw5trHV7pUjBPHRMBhz8x0GPED.jpg", PersonalRating: &r8},
		{TmdbID: 27205, Title: "Inception", OriginalTitle: "Inception", Year: 2010, Genres: "Action, Science-Fiction, Aventure", Director: "Christopher Nolan", PosterPath: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", PersonalRating: &r9},
		{TmdbID: 603, Title: "Matrix", OriginalTitle: "The Matrix", Year: 1999, Genres: "Action, Science-Fiction", Director: "Lana Wachowski, Lilly Wachowski", PosterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", PersonalRating: &r9},
		{TmdbID: 120, Title: "Le Seigneur des anneaux : La Communauté de l'anneau", OriginalTitle: "The Lord of the Rings: The Fellowship of the Ring", Year: 2001, Genres: "Aventure, Fantastique, Action", Director: "Peter Jackson", PosterPath: "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg", PersonalRating: &r8},
		{TmdbID: 278, Title: "Les Évadés", OriginalTitle: "The Shawshank Redemption", Year: 1994, Genres: "Drame, Crime", Director: "Frank Darabont", PosterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", PersonalRating: &r10},
		{TmdbID: 13, Title: "Forrest Gump", OriginalTitle: "Forrest Gump", Year: 1994, Genres: "Comédie, Drame, Romance", Director: "Robert Zemeckis", PosterPath: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", PersonalRating: &r7},
		{TmdbID: 569094, Title: "Spider-Man: Across the Spider-Verse", OriginalTitle: "Spider-Man: Across the Spider-Verse", Year: 2023, Genres: "Animation, Action, Aventure", Director: "Joaquim Dos Santos", PosterPath: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", PersonalRating: &r8},
	}

	for _, m := range movies {
		if _, err := movieService.AddMovie(userID, &m); err != nil {
			log.Printf("Seed: failed to add %s: %v", m.Title, err)
		}
	}

	log.Printf("Seed: added %d movies to dev user collection", len(movies))
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
