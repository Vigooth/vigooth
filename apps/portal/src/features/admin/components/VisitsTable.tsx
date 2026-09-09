import type { Visit } from '../types/visit';
import { countryFlag, formatLocation, formatReferrer, formatVisitDate } from '../utils/format';
import { summarizeUserAgent } from '../utils/userAgent';

interface VisitsTableProps {
  visits: Visit[];
  /** Drop the address columns, for a list that is already about one address. */
  compact?: boolean;
}

const headClass = 'px-2 py-1 text-left text-xs font-normal text-cpc-green-900';
const cellClass = 'px-2 py-1 align-top text-xs';

export function VisitsTable({ visits, compact = false }: VisitsTableProps) {
  if (visits.length === 0) {
    return <p className="text-xs text-cpc-green-900">AUCUNE VISITE</p>;
  }

  return (
    // Wide by nature: the table scrolls inside its own box rather than pushing
    // the page sideways on a phone.
    <div className="overflow-x-auto border-2 border-cpc-green-900">
      <table className={`w-full border-collapse ${compact ? 'min-w-[40rem]' : 'min-w-[64rem]'}`}>
        <thead>
          <tr className="border-b-2 border-cpc-green-900">
            <th className={headClass}>DATE</th>
            {!compact && <th className={headClass}>IP</th>}
            <th className={headClass}>COMPTE</th>
            {!compact && <th className={headClass}>LIEU</th>}
            {!compact && <th className={headClass}>FAI</th>}
            <th className={headClass}>APP</th>
            <th className={headClass}>PAGE</th>
            <th className={headClass}>PROVENANCE</th>
            <th className={headClass}>NAVIGATEUR</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => (
            <tr
              key={visit.id}
              className="border-b border-cpc-green-900/40 hover:bg-cpc-green-900/20"
            >
              <td className={`${cellClass} whitespace-nowrap text-cpc-green-500`}>
                {formatVisitDate(visit.created_at)}
              </td>
              {!compact && (
                <td className={`${cellClass} whitespace-nowrap text-cpc-cyan-500`}>{visit.ip}</td>
              )}
              <td
                className={`${cellClass} max-w-48 truncate text-cpc-yellow-500`}
                title={visit.user_email}
              >
                {visit.user_email || '—'}
              </td>
              <td className={`${cellClass} text-cpc-green-500`}>
                {visit.location && (
                  <span className="mr-1">{countryFlag(visit.location.country_code)}</span>
                )}
                {formatLocation(visit.location)}
              </td>
              <td
                className={`${cellClass} max-w-40 truncate text-cpc-green-900`}
                title={visit.location?.isp}
              >
                {visit.location?.isp || '—'}
              </td>
              <td className={`${cellClass} uppercase text-cpc-yellow-500`}>{visit.app}</td>
              <td
                className={`${cellClass} max-w-48 truncate text-cpc-green-500`}
                title={visit.path}
              >
                {visit.path || '/'}
              </td>
              <td
                className={`${cellClass} max-w-40 truncate text-cpc-green-900`}
                title={visit.referrer}
              >
                {formatReferrer(visit.referrer)}
              </td>
              <td
                className={`${cellClass} whitespace-nowrap text-cpc-green-900`}
                title={visit.user_agent}
              >
                {summarizeUserAgent(visit.user_agent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
