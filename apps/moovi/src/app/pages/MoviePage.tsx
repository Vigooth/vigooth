import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CpcLayout } from "@vigooth/ui";
import { Header } from "@/components/layout/Header";
import { MovieDetails } from "@/components/movies/MovieDetails";

export function MoviePage() {
  const { tmdbId: tmdbIdParam } = useParams<{ tmdbId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tmdbIdNum = tmdbIdParam ? parseInt(tmdbIdParam, 10) : null;
  const mediaType = location.pathname.startsWith("/tv/") ? "tv" : "movie";

  if (!tmdbIdNum) {
    return (
      <CpcLayout>
        <div className="h-full flex flex-col">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-cpc-cyan-500">MOVIE NOT FOUND</div>
          </div>
        </div>
      </CpcLayout>
    );
  }

  return (
    <CpcLayout>
      <div className="h-full flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto">
          <MovieDetails
            tmdbId={tmdbIdNum}
            mediaType={mediaType}
            onDeleted={() => navigate("/collection")}
          />
        </div>
      </div>
    </CpcLayout>
  );
}
