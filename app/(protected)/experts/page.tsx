'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Expert {
  id: string;
  name: string;
  slug: string;
  description: string;
  model: string;
  status: 'active' | 'building' | 'planned';
  domain: string;
  student_count: number;
}

const EXPERTS_SEED: Expert[] = [
  {
    id: 'ghl',
    name: 'GHL Expert',
    slug: 'ghl',
    description: 'Owns all GoHighLevel / NWS CRM operations — OAuth, sub-accounts, workflows, contacts, automations.',
    model: 'claude-sonnet-4.6',
    status: 'building',
    domain: 'CRM & Automation',
    student_count: 4,
  },
  {
    id: 'design',
    name: 'Design Expert',
    slug: 'design',
    description: 'Owns all UI/UX, web design, marketing design, and conversion optimization. Pulls daily from Dribbble, Behance, and design blogs.',
    model: 'google/gemini-2.5-pro',
    status: 'planned',
    domain: 'Design & Creative',
    student_count: 4,
  },
  {
    id: 'dev',
    name: 'Dev Expert',
    slug: 'dev',
    description: 'Owns frontend and backend architecture, code review, patterns, and technical debt management.',
    model: 'claude-sonnet-4.6',
    status: 'planned',
    domain: 'Engineering',
    student_count: 0,
  },
  {
    id: 'copy',
    name: 'Copy Expert',
    slug: 'copy',
    description: 'Owns copywriting, brand voice, persuasion frameworks, and content generation across all NWS products.',
    model: 'google/gemini-2.0-flash',
    status: 'planned',
    domain: 'Copywriting',
    student_count: 0,
  },
];

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  building: '#f59e0b',
  planned: '#6366f1',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  building: 'Building',
  planned: 'Planned',
};

export default function ExpertsPage() {
  return (
    <div style={{ padding: '2.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.375rem' }}>
          Expert Agents
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9375rem' }}>
          Domain experts that own their knowledge and tools. Each expert has a dedicated ChromaDB collection and student functionalities.
        </p>
      </div>

      {/* Architecture note */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start'
      }}>
        <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>🧠</span>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            Head Master delegates to Experts — never directly to Students
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
            Each Expert is a teacher who owns their domain fully. Students (functionalities) are tools the Expert deploys internally. You interact only with Head Master.
          </div>
        </div>
      </div>

      {/* Expert Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {EXPERTS_SEED.map(expert => (
          <div key={expert.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'border-color 0.15s',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                  {expert.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '0.125rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                  {expert.domain}
                </div>
              </div>
              <div style={{
                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
                color: STATUS_COLORS[expert.status],
                background: `${STATUS_COLORS[expert.status]}18`,
                padding: '0.25rem 0.625rem', borderRadius: '6px', border: `1px solid ${STATUS_COLORS[expert.status]}40`
              }}>
                {STATUS_LABELS[expert.status]}
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              {expert.description}
            </p>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {expert.student_count > 0
                  ? `${expert.student_count} student${expert.student_count !== 1 ? 's' : ''}`
                  : 'No students yet'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--muted)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                {expert.model}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
