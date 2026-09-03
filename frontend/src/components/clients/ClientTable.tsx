import * as React from 'react';
import Link from 'next/link';
import { Edit2, Trash2, Mail, Phone, MapPin, Building } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Client } from '@/lib/types';

export interface ClientTableProps {
  clients: Client[];
  onDelete: (client: Client) => void;
}

export function ClientTable({ clients, onDelete }: ClientTableProps) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/60">
            <TableHead className="w-64">Client</TableHead>
            <TableHead className="w-56">Company</TableHead>
            <TableHead className="w-60">Email</TableHead>
            <TableHead className="w-44">Phone</TableHead>
            <TableHead>Billing Address</TableHead>
            <TableHead className="text-right w-28">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const initial = client.name.charAt(0).toUpperCase();

            return (
              <TableRow key={client.id} className="hover:bg-slate-50/70 transition-colors">
                {/* Client Name + Avatar */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/60">
                      {initial}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{client.name}</p>
                      {client.company && (
                        <p className="text-xs text-slate-500 md:hidden">{client.company}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Company */}
                <TableCell>
                  {client.company ? (
                    <span className="font-medium text-slate-800 text-xs sm:text-sm">
                      {client.company}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No company</span>
                  )}
                </TableCell>

                {/* Email */}
                <TableCell>
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[180px]">{client.email}</span>
                  </a>
                </TableCell>

                {/* Phone */}
                <TableCell>
                  {client.phone ? (
                    <span className="text-xs text-slate-600">{client.phone}</span>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </TableCell>

                {/* Address */}
                <TableCell>
                  {client.address ? (
                    <p className="text-xs text-slate-500 truncate max-w-[220px]" title={client.address}>
                      {client.address}
                    </p>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/clients/${client.id}/edit`}>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title={`Edit ${client.name}`}
                        aria-label={`Edit ${client.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(client)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
                      title={`Delete ${client.name}`}
                      aria-label={`Delete ${client.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
