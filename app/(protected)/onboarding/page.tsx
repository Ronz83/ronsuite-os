'use client';

import { useState, useEffect } from 'react';
import { Power, BookOpen, RefreshCw, Send, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  trigger_phrase: string;
  input_schema: any;
  is_active: boolean;
}

interface Run {
  id: string;
  operator_email: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  inputs: any;
  outputs: any;
  error: string | null;
  created_at: string;
  workstation_skills: {
    name: string;
  } | null;
}

interface TrainingResource {
  id: string;
  type: 'video' | 'sop' | 'guide' | 'link';
  title: string;
  description: string;
  content: string;
  created_at: string;
}

export default function OnboardingHub() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [resources, setResources] = useState<TrainingResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingSkillId, setTogglingSkillId] = useState<string | null>(null);

  // Form State
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [primaryOffer, setPrimaryOffer] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState(false);

  // Log View State
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [selectedResource, setSelectedResource] = useState<TrainingResource | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [skillsRes, runsRes, resRes] = await Promise.all([
        fetch('/api/onboarding/skills').then(r => r.json()),
        fetch('/api/onboarding/runs').then(r => r.json()),
        fetch('/api/onboarding/training').then(r => r.json())
      ]);

      if (Array.isArray(skillsRes)) setSkills(skillsRes);
      if (Array.isArray(runsRes)) setRuns(runsRes);
      if (Array.isArray(resRes)) setResources(resRes);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSkill(id: string, currentStatus: boolean) {
    setTogglingSkillId(id);
    try {
      const res = await fetch('/api/onboarding/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });

      if (!res.ok) throw new Error('Failed to toggle skill');
      
      const updated = await res.json();
      setSkills(skills.map(s => s.id === id ? updated : s));
    } catch (err: any) {
      alert(err.message || 'Error toggling skill');
    } finally {
      setTogglingSkillId(null);
    }
  }

  async function handleGenerateTraining(e: React.FormEvent) {
    e.preventDefault();
    if (!niche.trim()) return;

    setGenerating(true);
    setGenSuccess(false);
    try {
      const res = await fetch('/api/onboarding/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: niche.trim(),
          targetAudience: targetAudience.trim() || undefined,
          primaryOffer: primaryOffer.trim() || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to generate training assets');
      
      setGenSuccess(true);
      setNiche('');
      setTargetAudience('');
      setPrimaryOffer('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error generating training assets');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-ui)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>Onboarding Hub</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Superadmin portal for NWS Workstation & Sales Academy</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && skills.length === 0 ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '4rem' }}>
          Loading Hub Data...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Active Skills & Training Generator Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Active Skills Panel */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Power size={18} style={{ color: 'var(--accent)' }} />
                <span>Workstation Active Tools</span>
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                Enable or disable tools available to the sales and onboarding teams on their workstations.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                {skills.map(skill => (
                  <div key={skill.id} style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9375rem' }}>{skill.name}</span>
                        <span style={{
                          fontSize: '0.75rem',
                          background: skill.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: skill.is_active ? '#22c55e' : 'var(--muted)',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '100px',
                          border: skill.is_active ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--border)'
                        }}>
                          {skill.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{skill.description}</p>
                    </div>

                    <button
                      onClick={() => toggleSkill(skill.id, skill.is_active)}
                      disabled={togglingSkillId !== null}
                      style={{
                        background: skill.is_active ? 'var(--accent)' : 'transparent',
                        border: skill.is_active ? 'none' : '1px solid var(--border)',
                        color: skill.is_active ? 'var(--text)' : 'var(--muted)',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: togglingSkillId !== null ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {togglingSkillId === skill.id ? '...' : skill.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Generator Panel */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <BookOpen size={18} style={{ color: 'var(--accent)' }} />
                <span>Sales Academy Generator</span>
              </h2>
              
              <form onSubmit={handleGenerateTraining} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  Generate targeted live-demo scripts, objection handlers, and client handover SOPs dynamically using Claude.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Niche Type / Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Roofing Contractors, Family Dentistry"
                    value={niche}
                    onChange={e => setNiche(e.target.value)}
                    required
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.625rem 0.875rem',
                      color: 'var(--text)',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Target Audience</label>
                    <input
                      type="text"
                      placeholder="e.g. Residential Homeowners"
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.625rem 0.875rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Primary Offer</label>
                    <input
                      type="text"
                      placeholder="e.g. Free Roof Inspection"
                      value={primaryOffer}
                      onChange={e => setPrimaryOffer(e.target.value)}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.625rem 0.875rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: generating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}
                >
                  <Send size={16} />
                  <span>{generating ? 'Generating...' : 'Publish to Academy'}</span>
                </button>

                {genSuccess && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '8px',
                    color: '#22c55e',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle size={16} />
                    <span>Assets published successfully to the Sales Academy!</span>
                  </div>
                )}
              </form>
            </div>

          </div>

          {/* Academy Materials Panel */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <BookOpen size={18} style={{ color: 'var(--accent)' }} />
              <span>Published Academy Materials</span>
            </h2>

            {resources.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                No sales resources published yet. Use the Sales Academy Generator above.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {resources.map(res => (
                  <div key={res.id} style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.6875rem',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '100px',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>{res.type}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {new Date(res.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9375rem', marginTop: '0.5rem' }}>{res.title}</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{res.description}</p>
                    </div>
                    
                    <button
                      onClick={() => setSelectedResource(res)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        borderRadius: '6px',
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem'
                      }}
                    >
                      <Eye size={14} />
                      <span>View Asset</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workstation Execution Logs */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--accent)' }} />
              <span>Workstation Execution Logs</span>
            </h2>

            {runs.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                No execution logs found. Runs will appear here once tools are triggered.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Tool Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Operator</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Niche / Business</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(run => (
                      <tr key={run.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {new Date(run.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          {run.workstation_skills?.name || 'Unknown Skill'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--muted)' }}>
                          {run.operator_email}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {run.inputs?.businessName || run.inputs?.niche || 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.125rem 0.5rem',
                            borderRadius: '100px',
                            background: run.status === 'success' ? 'rgba(34, 197, 94, 0.15)' :
                                        run.status === 'failed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: run.status === 'success' ? '#22c55e' :
                                   run.status === 'failed' ? '#ef4444' : '#f59e0b'
                          }}>
                            {run.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button
                            onClick={() => setSelectedRun(run)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--accent)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.8125rem'
                            }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedRun && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
            padding: '2rem', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => setSelectedRun(null)}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.25rem'
              }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>
              Execution Run Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Skill Name:</span>
                  <div style={{ color: 'var(--text)', fontWeight: 600, marginTop: '0.125rem' }}>{selectedRun.workstation_skills?.name}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Operator:</span>
                  <div style={{ color: 'var(--text)', marginTop: '0.125rem' }}>{selectedRun.operator_email}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Status:</span>
                  <div style={{ color: 'var(--text)', fontWeight: 600, textTransform: 'capitalize', marginTop: '0.125rem' }}>{selectedRun.status}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Run ID:</span>
                  <div style={{ color: 'var(--text)', fontSize: '0.75rem', marginTop: '0.125rem' }}>{selectedRun.id}</div>
                </div>
              </div>

              {/* Inputs */}
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 500 }}>Intake Inputs</span>
                <pre style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '1rem', fontSize: '0.8125rem', overflowX: 'auto', color: 'var(--text)', marginTop: '0.375rem',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                }}>
                  {JSON.stringify(selectedRun.inputs, null, 2)}
                </pre>
              </div>

              {/* Error */}
              {selectedRun.error && (
                <div>
                  <span style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 500 }}>Execution Error</span>
                  <pre style={{
                    background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px',
                    padding: '1rem', fontSize: '0.8125rem', color: '#ef4444', marginTop: '0.375rem'
                  }}>
                    {selectedRun.error}
                  </pre>
                </div>
              )}

              {/* Outputs / Generated Prompts */}
              {selectedRun.outputs && (
                <div>
                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 500 }}>Output Output/Prompts</span>
                  
                  {selectedRun.outputs.outputText ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <pre style={{
                        background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
                        padding: '1rem', fontSize: '0.8125rem', overflowX: 'auto', color: 'var(--text)',
                        maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace'
                      }}>
                        {selectedRun.outputs.outputText}
                      </pre>
                      
                      {selectedRun.outputs.meta && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                          <strong>Location ID created:</strong> {selectedRun.outputs.meta.locationId || 'N/A'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <pre style={{
                      background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
                      padding: '1rem', fontSize: '0.8125rem', overflowX: 'auto', color: 'var(--text)', marginTop: '0.375rem'
                    }}>
                      {JSON.stringify(selectedRun.outputs, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resource Details Modal */}
      {selectedResource && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
            padding: '2rem', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => setSelectedResource(null)}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.25rem'
              }}
            >
              ✕
            </button>
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              padding: '0.125rem 0.5rem',
              borderRadius: '100px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>{selectedResource.type}</span>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
              {selectedResource.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>{selectedResource.description}</p>

            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '1.5rem', fontSize: '0.875rem', color: 'var(--text)', overflowY: 'auto',
              whiteSpace: 'pre-wrap', maxHeight: '500px', fontFamily: 'inherit', lineHeight: '1.6'
            }}>
              {selectedResource.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
