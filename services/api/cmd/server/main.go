package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"strconv"

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
	steamApiKey := os.Getenv("STEAM_API_KEY")
	steamBaseURL := getEnv("STEAM_BASE_URL", "http://localhost:5177")
	databaseURL := os.Getenv("DATABASE_URL")

	// Dependencies
	var vaultRepo repository.VaultRepository
	var userRepo repository.UserRepository
	var movieRepo repository.MovieRepository
	var wishlistRepo repository.WishlistRepository
	var recoRepo repository.RecommendationRepository

	if databaseURL != "" {
		// PostgreSQL mode
		log.Println("Connecting to PostgreSQL...")
		pool, err := repository.NewPostgresPool(databaseURL)
		if err != nil {
			log.Fatalf("Failed to connect to database: %v", err)
		}
		defer pool.Close()
		log.Println("Connected to PostgreSQL")

		if err := repository.RunMigrations(pool, "migrations"); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}

		vaultRepo = repository.NewPostgresVaultRepository(pool)
		userRepo = repository.NewPostgresUserRepository(pool)
		movieRepo = repository.NewPostgresMovieRepository(pool)
		wishlistRepo = repository.NewPostgresWishlistRepository(pool)
		recoRepo = repository.NewPostgresRecommendationRepository(pool)
	} else {
		// In-memory mode (development)
		log.Println("Running in-memory mode (no DATABASE_URL set)")
		vaultRepo = repository.NewInMemoryVaultRepository()
		userRepo = repository.NewInMemoryUserRepository()
		movieRepo = repository.NewInMemoryMovieRepository()
		wishlistRepo = repository.NewInMemoryWishlistRepository()
		recoRepo = repository.NewInMemoryRecommendationRepository()
	}

	vaultService := service.NewVaultService(vaultRepo)
	movieService := service.NewMovieService(movieRepo)
	wishlistService := service.NewWishlistService(wishlistRepo)
	authService := service.NewAuthService(userRepo, jwtSecret)

	cookieDomain := os.Getenv("COOKIE_DOMAIN") // empty in dev, ".vigooth.com" in prod
	cookieSecure := cookieDomain != ""          // HTTPS-only when domain is set (prod)

	vaultHandler := handler.NewVaultHandler(vaultService)
	movieHandler := handler.NewMovieHandler(movieService, tmdbApiKey)
	wishlistHandler := handler.NewWishlistHandler(wishlistService)
	proxyHandler := handler.NewProxyHandler(tmdbApiKey, omdbApiKey, os.Getenv("TOR_SOCKS_ADDR"))
	authHandler := handler.NewAuthHandler(authService, handler.CookieConfig{
		Domain: cookieDomain,
		Secure: cookieSecure,
		MaxAge: 86400, // 24h
	})

	// Steam handlers (optional — needs STEAM_API_KEY)
	var steamAuthHandler *handler.SteamAuthHandler
	var steamProxyHandler *handler.SteamProxyHandler
	if steamApiKey != "" {
		steamAuthHandler = handler.NewSteamAuthHandler(steamApiKey, jwtSecret, handler.CookieConfig{
			Domain: cookieDomain,
			Secure: cookieSecure,
			MaxAge: 604800, // 7 days
		}, steamBaseURL)
		steamProxyHandler = handler.NewSteamProxyHandler(steamApiKey)
		log.Println("Steam API enabled")
	} else {
		log.Println("Steam API disabled (no STEAM_API_KEY)")
	}

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
	r.POST("/auth/logout", authHandler.Logout)

	// Steam auth routes
	if steamAuthHandler != nil {
		r.GET("/auth/steam/login", steamAuthHandler.Login)
		r.GET("/auth/steam/callback", steamAuthHandler.Callback)
		r.GET("/auth/steam/me", steamAuthHandler.Me)
		r.POST("/auth/steam/logout", steamAuthHandler.Logout)
	}

	// Public routes (no auth)
	r.GET("/public/collection/:userId", movieHandler.GetPublicCollection)

	// Public proxy routes (no user data, just external API proxies)
	pub := r.Group("/api")
	{
		pub.GET("/tmdb/movie/:id", proxyHandler.TmdbMovieDetail)
		pub.GET("/tmdb/movie/:id/credits", proxyHandler.TmdbMovieCredits)
		pub.GET("/tmdb/tv/:id", proxyHandler.TmdbTvDetail)
		pub.GET("/tmdb/tv/:id/credits", proxyHandler.TmdbTvCredits)
		pub.GET("/omdb", proxyHandler.OmdbRatings)
		pub.GET("/allocine/ratings", proxyHandler.AllocineRatings)
	}

	// Steam proxy routes (protected)
	if steamProxyHandler != nil {
		steam := r.Group("/api/steam")
		steam.Use(authMiddleware.RequireAuth())
		{
			steam.GET("/owned-games/:steamId", steamProxyHandler.OwnedGames)
			steam.GET("/player-summary/:steamId", steamProxyHandler.PlayerSummary)
			steam.GET("/player-summaries", steamProxyHandler.PlayerSummaries)
			steam.GET("/friend-list/:steamId", steamProxyHandler.FriendList)
			steam.GET("/resolve-vanity/:vanityUrl", steamProxyHandler.ResolveVanity)
			steam.GET("/store/app", steamProxyHandler.StoreAppDetails)
		}
	}

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
		api.GET("/movies/tmdb-ids", movieHandler.GetTmdbIDs)
		api.POST("/movies/backfill-overviews", movieHandler.BackfillOverviews)

		api.GET("/wishlist", wishlistHandler.GetWishlist)
		api.POST("/wishlist", wishlistHandler.AddToWishlist)
		api.DELETE("/wishlist/:tmdbId", wishlistHandler.RemoveFromWishlist)

		api.GET("/tmdb/search", proxyHandler.TmdbSearch)
		api.GET("/tmdb/search-person", proxyHandler.TmdbSearchPerson)
		api.GET("/tmdb/discover/movie", proxyHandler.TmdbDiscoverByPerson)
		api.GET("/yts", proxyHandler.YtsLookup)
		api.GET("/service/status", proxyHandler.ServiceHealth)

		if recoHandler != nil {
			api.POST("/recommendations/stream", recoHandler.StreamRecommendations)
			api.POST("/recommendations/stream-simple", recoHandler.StreamRecommendationsSimple)
			api.GET("/recommendations/history", recoHandler.GetHistory)
		}
	}

	port = findAvailablePort(port)
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

	// Second dev user for comparison testing
	resp2, err := authService.Register(model.RegisterRequest{
		Email:    "p@p.com",
		Password: "dev12345",
	})
	if err != nil {
		log.Printf("Seed: second user already exists or error: %v", err)
		return
	}

	userID2 := resp2.User.ID
	log.Printf("Seed: created second dev user (email: p@p.com, password: dev12345)")

	r6 := 6

	movies2 := []model.AddMovieRequest{
		// Films en commun avec t@t.com
		{TmdbID: 550, Title: "Fight Club", OriginalTitle: "Fight Club", Year: 1999, Genres: "Drame, Thriller", Director: "David Fincher", PosterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", PersonalRating: &r9},
		{TmdbID: 680, Title: "Pulp Fiction", OriginalTitle: "Pulp Fiction", Year: 1994, Genres: "Thriller, Crime", Director: "Quentin Tarantino", PosterPath: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", PersonalRating: &r10},
		{TmdbID: 27205, Title: "Inception", OriginalTitle: "Inception", Year: 2010, Genres: "Action, Science-Fiction, Aventure", Director: "Christopher Nolan", PosterPath: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", PersonalRating: &r8},
		{TmdbID: 603, Title: "Matrix", OriginalTitle: "The Matrix", Year: 1999, Genres: "Action, Science-Fiction", Director: "Lana Wachowski, Lilly Wachowski", PosterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", PersonalRating: &r10},
		{TmdbID: 278, Title: "Les Évadés", OriginalTitle: "The Shawshank Redemption", Year: 1994, Genres: "Drame, Crime", Director: "Frank Darabont", PosterPath: "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg", PersonalRating: &r9},
		{TmdbID: 807, Title: "Seven", OriginalTitle: "Se7en", Year: 1995, Genres: "Crime, Mystère, Thriller", Director: "David Fincher", PosterPath: "/6yoghtyTpznpBik8EngEmJskVUO.jpg", PersonalRating: &r7},
		// Films uniques à p@p.com
		{TmdbID: 238, Title: "Le Parrain", OriginalTitle: "The Godfather", Year: 1972, Genres: "Drame, Crime", Director: "Francis Ford Coppola", PosterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", PersonalRating: &r10},
		{TmdbID: 240, Title: "Le Parrain 2", OriginalTitle: "The Godfather Part II", Year: 1974, Genres: "Drame, Crime", Director: "Francis Ford Coppola", PosterPath: "/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg", PersonalRating: &r9},
		{TmdbID: 155, Title: "The Dark Knight", OriginalTitle: "The Dark Knight", Year: 2008, Genres: "Drame, Action, Crime, Thriller", Director: "Christopher Nolan", PosterPath: "/qJ2tW6WMUDux911BTUgMe1nGqIs.jpg", PersonalRating: &r9},
		{TmdbID: 424, Title: "La Liste de Schindler", OriginalTitle: "Schindler's List", Year: 1993, Genres: "Drame, Histoire, Guerre", Director: "Steven Spielberg", PosterPath: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg", PersonalRating: &r10},
		{TmdbID: 389, Title: "12 Angry Men", OriginalTitle: "12 Angry Men", Year: 1957, Genres: "Drame", Director: "Sidney Lumet", PosterPath: "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg", PersonalRating: &r8},
		{TmdbID: 497, Title: "Le Bon, la Brute et le Truand", OriginalTitle: "The Good, the Bad and the Ugly", Year: 1966, Genres: "Western", Director: "Sergio Leone", PosterPath: "/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg", PersonalRating: &r8},
		{TmdbID: 11216, Title: "Cinema Paradiso", OriginalTitle: "Nuovo Cinema Paradiso", Year: 1988, Genres: "Drame, Romance", Director: "Giuseppe Tornatore", PosterPath: "/8SRUfRUi6x4LWc1pmhZ2z32x2JN.jpg", PersonalRating: &r8},
		{TmdbID: 637, Title: "La Vie est belle", OriginalTitle: "La vita è bella", Year: 1997, Genres: "Comédie, Drame", Director: "Roberto Benigni", PosterPath: "/74hLDKjD5aGYOotO6esUVaeISa2.jpg", PersonalRating: &r9},
		{TmdbID: 274, Title: "Le Silence des agneaux", OriginalTitle: "The Silence of the Lambs", Year: 1991, Genres: "Crime, Drame, Thriller", Director: "Jonathan Demme", PosterPath: "/rplLJ2hPcOQmkFhTqUte0MkEb9a.jpg", PersonalRating: &r8},
		{TmdbID: 857, Title: "Saving Private Ryan", OriginalTitle: "Saving Private Ryan", Year: 1998, Genres: "Drame, Histoire, Guerre", Director: "Steven Spielberg", PosterPath: "/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg", PersonalRating: &r8},
		{TmdbID: 598, Title: "Usual Suspects", OriginalTitle: "The Usual Suspects", Year: 1995, Genres: "Drame, Crime, Thriller", Director: "Bryan Singer", PosterPath: "/bUPmtQzrRhzqYySeiMpv7GurAfm.jpg", PersonalRating: &r9},
		{TmdbID: 197, Title: "Braveheart", OriginalTitle: "Braveheart", Year: 1995, Genres: "Action, Drame, Histoire, Guerre", Director: "Mel Gibson", PosterPath: "/or1gBugydmjToAEq7OZY0owwFk.jpg", PersonalRating: &r7},
		{TmdbID: 120467, Title: "The Grand Budapest Hotel", OriginalTitle: "The Grand Budapest Hotel", Year: 2014, Genres: "Comédie, Drame", Director: "Wes Anderson", PosterPath: "/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg", PersonalRating: &r8},
		{TmdbID: 769, Title: "GoodFellas", OriginalTitle: "GoodFellas", Year: 1990, Genres: "Drame, Crime", Director: "Martin Scorsese", PosterPath: "/aKuFiU82s5ISJpGZp7YkIR3UBSd.jpg", PersonalRating: &r9},
		{TmdbID: 429, Title: "Le Fabuleux Destin d'Amélie Poulain", OriginalTitle: "Le Fabuleux Destin d'Amélie Poulain", Year: 2001, Genres: "Comédie, Romance", Director: "Jean-Pierre Jeunet", PosterPath: "/nSxDa3ppafARKkYyy2MAvvyMQ2u.jpg", PersonalRating: &r6},
	}

	for _, m := range movies2 {
		if _, err := movieService.AddMovie(userID2, &m); err != nil {
			log.Printf("Seed: failed to add %s: %v", m.Title, err)
		}
	}

	log.Printf("Seed: added %d movies to second dev user collection", len(movies2))
}

func findAvailablePort(preferred string) string {
	ln, err := net.Listen("tcp", ":"+preferred)
	if err == nil {
		ln.Close()
		return preferred
	}

	p, _ := strconv.Atoi(preferred)
	for i := 1; i <= 10; i++ {
		candidate := fmt.Sprintf("%d", p+i)
		ln, err := net.Listen("tcp", ":"+candidate)
		if err == nil {
			ln.Close()
			log.Printf("Port %s in use, using %s instead", preferred, candidate)
			return candidate
		}
	}

	log.Fatalf("No available port found in range %s-%d", preferred, p+10)
	return preferred
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
