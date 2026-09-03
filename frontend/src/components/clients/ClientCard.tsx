import * as React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Building, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Client } from '@/lib/types';

export interface ClientCardProps {
  client: Client;
  onDelete: (client: Client) => void;
}

export function ClientCard({ client, onDelete }: ClientCardProps) {
  const initial = client.name.charAt(0).toUpperCase();

  return (
    <Card className="border border-slate-200/90 bg-white shadow-xs md:hidden">
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Header with Avatar & Name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm border border-indigo-200/60">
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate">{client.name}</h3>
              {client.company && (
                <p className="text-xs text-indigo-600 font-medium truncate flex items-center gap-1 mt-0.5">
                  <Building className="h-3 w-3 shrink-0" />
                  <span>{client.company}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-1.5 pt-1 text-xs text-slate-600 border-t border-slate-100">
          <div className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <a href={`mailto:${client.email}`} className="truncate hover:text-indigo-600">
              {client.email}
            </a>
          </div>

          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}

          {client.address && (
            <div className="flex items-start gap-2 pt-0.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="text-slate-500 leading-tight">{client.address}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          <Link href={`/clients/${client.id}/edit`} className="flex-1 sm:flex-initial">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs"
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(client)}
            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
