import { cn } from "@vigooth/ui";
import {
  useTmdbMovieDetail,
  useTmdbMovieCredits,
  useTmdbTvDetail,
  useTmdbTvCredits,
} from "@/hooks/useTmdbSearch";
import { useOmdbRatings } from "@/hooks/useOmdbRatings";
import { useAllocineRatings } from "@/hooks/useAllocineRatings";
import { getBackdropUrl, getPosterUrl } from "@/utils/tmdbImage";
import { formatRuntime } from "@/utils/ratings";
import { RatingBadge } from "@/components/movies/RatingBadge";
import { ExternalLinks } from "@/components/movies/ExternalLinks";
import { PersonalRating } from "@/components/movies/PersonalRating";
import type { Movie } from "@/types/movie";

interface PublicMovieDetailsProps {
  movie: Movie;
}

export function PublicMovieDetails({ movie }: PublicMovieDetailsProps) {
  const isTv = movie.media_type === "tv";
  const tmdbIdNum = movie.tmdb_id;

  // TMDB data
  const { data: movieDetails } = useTmdbMovieDetail(isTv ? null : tmdbIdNum);
  const { data: movieCredits } = useTmdbMovieCredits(isTv ? null : tmdbIdNum);
  const { data: tvDetails } = useTmdbTvDetail(isTv ? tmdbIdNum : null);
  const { data: tvCredits } = useTmdbTvCredits(isTv ? tmdbIdNum : null);

  const tmdbDetails = isTv ? tvDetails : movieDetails;
  const credits = isTv ? tvCredits : movieCredits;

  const imdbId = isTv
    ? tvDetails?.external_ids?.imdb_id || movie.imdb_id || null
    : movieDetails?.imdb_id || movie.imdb_id || null;

  const { data: omdb } = useOmdbRatings(imdbId);
  const { data: allocine } = useAllocineRatings(imdbId);

  // Prefer TMDB data, fall back to collection data
  const title = (isTv ? tvDetails?.name : movieDetails?.title) || movie.title;
  const originalTitle =
    (isTv ? tvDetails?.original_name : movieDetails?.original_title) || movie.original_title;
  const overview = tmdbDetails?.overview || movie.overview || "";
  const posterPath = tmdbDetails?.poster_path || movie.poster_path;
  const backdropPath = tmdbDetails?.backdrop_path || movie.backdrop_path;
  const runtimeMinutes = isTv
    ? tvDetails?.episode_run_time?.[0] || 0
    : movieDetails?.runtime || movie.runtime || 0;

  const director = isTv
    ? tvDetails?.created_by?.[0]?.name ||
      credits?.crew.find((c) => c.job === "Director")?.name ||
      movie.director ||
      ""
    : credits?.crew.find((c) => c.job === "Director")?.name || movie.director || "";
  const genres =
    (isTv ? tvDetails?.genres : movieDetails?.genres)?.map((g) => g.name) ||
    (movie.genres ? tryParseGenres(movie.genres) : []);
  const dateStr = isTv ? tvDetails?.first_air_date : movieDetails?.release_date;
  const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : movie.year;
  const seasonInfo =
    isTv && tvDetails ? `${tvDetails.number_of_seasons}S ${tvDetails.number_of_episodes}EP` : "";

  const imdbRating = movie.imdb_rating ?? omdb?.imdbRating ?? null;
  const metascore = movie.metascore ?? omdb?.metascore ?? null;
  const rottenTomatoes = movie.rotten_tomatoes ?? omdb?.rottenTomatoes ?? null;

  const backdropUrl = getBackdropUrl(backdropPath);
  const posterUrl = getPosterUrl(posterPath, "w342");
  const runtime = formatRuntime(runtimeMinutes);

  return (
    <>
      {/* Backdrop */}
      {backdropUrl && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <img src={backdropUrl} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
        </div>
      )}

      <div className={cn("p-4 max-w-4xl mx-auto", backdropUrl && "-mt-20 relative")}>
        <div className="mb-6">
          {/* Poster — floated left */}
          {posterUrl && (
            <div className="group float-left w-32 md:w-48 mr-4 mb-2 overflow-hidden">
              <img
                src={posterUrl}
                alt={title}
                className="w-full border-2 border-cpc-green-500 transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          )}

          <h1 className="text-cpc-cyan-500 text-xl md:text-2xl font-bold">{title}</h1>
          {originalTitle && originalTitle !== title && (
            <div className="text-cpc-green-900 text-sm">{originalTitle}</div>
          )}

          <div className="text-cpc-green-500 text-sm mt-1 flex flex-wrap gap-2 items-center">
            <span>{year}</span>
            {director && (
              <>
                <span className="text-cpc-green-900">|</span>
                <span>{director}</span>
              </>
            )}
            {seasonInfo && (
              <>
                <span className="text-cpc-green-900">|</span>
                <span>{seasonInfo}</span>
              </>
            )}
            {runtime && (
              <>
                <span className="text-cpc-green-900">|</span>
                <span>{runtime}</span>
              </>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="border border-cpc-green-900 text-cpc-green-500 px-2 py-0.5 text-xs"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Ratings */}
          <div className="flex flex-wrap gap-3 mt-3">
            <RatingBadge label="IMDb" value={imdbRating} max={10} />
            <RatingBadge label="Metascore" value={metascore} max={100} />
            <RatingBadge label="RT" value={rottenTomatoes} max={100} suffix="%" />
            <RatingBadge label="AC Presse" value={allocine?.press ?? null} max={5} />
            <RatingBadge label="AC Spect." value={allocine?.spectateurs ?? null} max={5} />
          </div>

          {/* External links */}
          <div className="mt-3">
            <ExternalLinks
              imdbId={imdbId}
              tmdbId={tmdbIdNum}
              title={title}
              year={year}
              allocineId={allocine?.allocine_id}
              mediaType={movie.media_type}
            />
          </div>

          {/* Personal rating (read-only) */}
          {movie.personal_rating != null && (
            <div className="mt-3">
              <PersonalRating value={movie.personal_rating} onChange={() => {}} disabled />
            </div>
          )}
        </div>

        {/* Overview */}
        {overview && (
          <div className="mb-6">
            <div className="text-cpc-cyan-500 text-sm font-bold mb-1">SYNOPSIS</div>
            <div className="text-cpc-green-500 text-sm leading-relaxed">{overview}</div>
          </div>
        )}

        {/* Cast */}
        {credits && credits.cast.length > 0 && (
          <div className="mb-6">
            <div className="text-cpc-cyan-500 text-sm font-bold mb-1">CAST</div>
            <div className="flex flex-wrap gap-2">
              {credits.cast.slice(0, 10).map((actor) => (
                <span
                  key={actor.id}
                  className="border border-cpc-green-900 text-cpc-green-500 px-2 py-0.5 text-xs"
                >
                  {actor.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes (read-only) */}
        {movie.notes && (
          <div className="mb-6">
            <div className="text-cpc-cyan-500 text-sm font-bold mb-1">NOTES</div>
            <div className="text-cpc-green-500 text-sm leading-relaxed whitespace-pre-wrap">
              {movie.notes}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function tryParseGenres(genresStr: string): string[] {
  if (!genresStr) return [];
  try {
    const parsed = JSON.parse(genresStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Genres stored as comma-separated string
    return genresStr
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }
  return [];
}
