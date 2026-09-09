import { useState } from 'react';
import type { Visitor } from '../types/visit';
import { countryFlag, formatLocation, formatVisitDate } from '../utils/format';
import { VisitorHistory } from './VisitorHistory';

interface VisitorsTableProps {
  visitors: Visitor[];
}

const headClass = 'px-2 py-1 text-left text-xs font-normal text-cpc-green-900';
const cellClass = 'px-2 py-1 align-top text-xs';
const COLUMNS = 8;

/**
 * One row per address, opening in place on the full history of that address.
 * A single row is open at a time: the point is to drill into one visitor, and
 * several open histories would push the list itself out of sight.
 */
export function VisitorsTable({ visitors }: VisitorsTableProps) {
  const [openIP, setOpenIP] = useState<string | null>(null);

  if (visitors.length === 0) {
    return <p className="text-xs text-cpc-green-900">AUCUNE VISITE</p>;
  }

  const toggle = (ip: string) => {
    setOpenIP((current) => (current === ip ? null : ip));
  };

  return (
    <div className="overflow-x-auto border-2 border-cpc-green-900">
      <table className="w-full min-w-[64rem] border-collapse">
        <thead>
          <tr className="border-b-2 border-cpc-green-900">
            <th className={headClass} />
            <th className={headClass}>IP</th>
            <th className={headClass}>LIEU</th>
            <th className={headClass}>FAI</th>
            <th className={headClass}>COMPTES</th>
            <th className={headClass}>APPS</th>
            <th className={`${headClass} text-right`}>VISITES</th>
            <th className={headClass}>DERNIERE</th>
          </tr>
        </thead>
        <tbody>
          {visitors.map((visitor) => {
            const open = visitor.ip === openIP;
            return [
              <tr
                key={visitor.ip}
                onClick={() => toggle(visitor.ip)}
                className={`cursor-pointer border-b border-cpc-green-900/40 hover:bg-cpc-green-900/20 ${
                  open ? 'bg-cpc-green-900/20' : ''
                }`}
              >
                <td className={`${cellClass} w-6 text-cpc-green-900`}>{open ? 'v' : '>'}</td>
                <td className={`${cellClass} whitespace-nowrap text-cpc-cyan-500`}>{visitor.ip}</td>
                <td className={`${cellClass} text-cpc-green-500`}>
                  {visitor.location && (
                    <span className="mr-1">{countryFlag(visitor.location.country_code)}</span>
                  )}
                  {formatLocation(visitor.location)}
                </td>
                <td
                  className={`${cellClass} max-w-40 truncate text-cpc-green-900`}
                  title={visitor.location?.isp}
                >
                  {visitor.location?.isp || '—'}
                </td>
                <td className={`${cellClass} text-cpc-yellow-500`}>
                  {visitor.accounts.length > 0 ? visitor.accounts.join(', ') : '—'}
                </td>
                <td className={`${cellClass} uppercase text-cpc-green-500`}>
                  {visitor.apps.join(', ')}
                </td>
                <td className={`${cellClass} text-right text-cpc-yellow-500`}>{visitor.visits}</td>
                <td className={`${cellClass} whitespace-nowrap text-cpc-green-500`}>
                  {formatVisitDate(visitor.last_seen)}
                </td>
              </tr>,
              open && (
                <tr key={`${visitor.ip}-history`} className="border-b border-cpc-green-900/40">
                  <td colSpan={COLUMNS} className="p-3">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-cpc-green-900">
                        PREMIERE VISITE {formatVisitDate(visitor.first_seen)}
                      </span>
                      <VisitorHistory ip={visitor.ip} />
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
