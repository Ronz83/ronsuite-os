'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  CheckSquare, 
  Calculator, 
  Play, 
  Square, 
  User, 
  Activity, 
  Sparkles, 
  Download, 
  MessageSquare, 
  Plus, 
  Check, 
  ArrowRight,
  RefreshCw,
  Info,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Types
interface ChatMessage {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  options?: string[];
}

interface TranscriptLine {
  sender: string;
  text: string;
  timestamp: string;
  detectedField?: string;
  detectedValue?: string;
}

export default function MeetingCopilotPage() {
  const supabase = createClient();

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: '👋 Welcome to the NWS Meeting Copilot. I can help you structure and run your sales/onboarding meetings in real-time. Choose a guide below or start typing to build a custom meeting structure.',
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [surveyStep, setSurveyStep] = useState(0); // 0 = ready, 1 = industry, 2 = pricing, 3 = focus, 4 = objective, 5 = completed
  const [selections, setSelections] = useState({
    industry: '',
    pricing: '',
    focus: '',
    objective: ''
  });

  // Interactive Playbook State (Right Pane)
  const [clientName, setClientName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [domain, setDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    hook: false,
    mathAudit: false,
    mechanismDemo: false,
    saasStack: false,
    dnsSubdomain: false,
    calendarConnect: false,
    reviewRules: false,
    leadConnectorApp: false
  });

  // Calculator
  const [monthlyCalls, setMonthlyCalls] = useState(300);
  const [missedCallRate, setMissedCallRate] = useState(27); // %
  const [bookingRate, setBookingRate] = useState(50); // %
  const [closeRate, setCloseRate] = useState(25); // %
  const [valuePerJob, setValuePerJob] = useState(800); // $

  // Live Call AI Listener State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [activeVoiceWave, setActiveVoiceWave] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});
  
  // Ref for transcript scrolling
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Simulated transcription dialogue sequence
  const transcriptSequence: Omit<TranscriptLine, 'timestamp'>[] = [
    { sender: 'AM', text: 'Thanks for connecting, Ronald. I noticed you own Elite Plumbing & HVAC. How long have you operated?' },
    { sender: 'Ronald', text: 'Yeah, we have been around for about 12 years here. We have 6 trucks on the road now.', detectedField: 'businessName', detectedValue: 'Elite Plumbing & HVAC' },
    { sender: 'AM', text: 'That is great. And about how many inbound customer calls or inquiries do you get in a typical month?' },
    { sender: 'Ronald', text: 'Typically, we get about 250 calls a month. Lots of emergency stuff and service bookings.', detectedField: 'monthlyCalls', detectedValue: '250' },
    { sender: 'AM', text: 'Got it. And what percentage of those do you think end up going to voicemail because the dispatchers are busy?' },
    { sender: 'Ronald', text: 'To be honest, it is probably about 30%. It is hard to keep up when the guys are checking in parts or on other lines.', detectedField: 'missedCallRate', detectedValue: '30' },
    { sender: 'AM', text: 'Right, so that is about 75 missed calls. What is an average repair ticket value for your residential jobs?' },
    { sender: 'Ronald', text: 'An average diagnostic and repair is around $650, but replacements can go up to $8,000.', detectedField: 'valuePerJob', detectedValue: '650' },
    { sender: 'AM', text: 'Exactly. Under standard rates, 80% of missed callers hang up and call the next contractor on Google. That is a massive leak.' },
    { sender: 'Ronald', text: 'Wow, I never looked at it that way. That is almost 60 lost repairs. That is huge money.', detectedField: 'notes', detectedValue: 'Customer was shocked by the $39,000 monthly missed call leak.' },
    { sender: 'AM', text: 'Let’s check your domain configurations. What is your current website address?' },
    { sender: 'Ronald', text: 'Our website is eliteplumbingny.com. We host it on GoDaddy.', detectedField: 'domain', detectedValue: 'eliteplumbingny.com' },
    { sender: 'AM', text: 'Excellent. For GHL booking, we’ll set up a subdomain like booking.eliteplumbingny.com. Does that work?' },
    { sender: 'Ronald', text: 'Yes, booking.eliteplumbingny.com is perfect. Let’s use that.', detectedField: 'subdomain', detectedValue: 'booking.eliteplumbingny.com' },
    { sender: 'AM', text: 'Awesome. I’ll make sure our onboarding engineers prepare the configurations.' },
    { sender: 'Ronald', text: 'Great. Let’s do the $299 plan. You can email me at info@eliteplumbingny.com or call 555-0199.', detectedField: 'email', detectedValue: 'info@eliteplumbingny.com' }
  ];

  // Auto-scroll scrollable divs
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // AI Listener Transcription Simulator
  useEffect(() => {
    let intervalId: any;
    if (isListening) {
      let index = 0;
      setTranscript([]);
      setActiveVoiceWave(true);

      intervalId = setInterval(() => {
        if (index < transcriptSequence.length) {
          const rawLine = transcriptSequence[index];
          const newLine: TranscriptLine = {
            ...rawLine,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          
          setTranscript(prev => [...prev, newLine]);

          // Handle field auto-population and visual flash highlight
          if (newLine.detectedField) {
            const field = newLine.detectedField;
            const value = newLine.detectedValue;

            // Highlight field
            setHighlightedFields(prev => ({ ...prev, [field]: true }));
            
            // Apply value to state
            if (field === 'businessName') setBusinessName(value || '');
            if (field === 'monthlyCalls') setMonthlyCalls(parseInt(value || '300', 10));
            if (field === 'missedCallRate') setMissedCallRate(parseInt(value || '27', 10));
            if (field === 'valuePerJob') setValuePerJob(parseInt(value || '800', 10));
            if (field === 'domain') setDomain(value || '');
            if (field === 'subdomain') setSubdomain(value || '');
            if (field === 'email') setEmail(value || '');
            if (field === 'notes') setNotes(prev => prev + '\n' + (value || ''));

            // Remove highlight after 2.5 seconds
            setTimeout(() => {
              setHighlightedFields(prev => ({ ...prev, [field]: false }));
            }, 2500);
          }

          index++;
        } else {
          clearInterval(intervalId);
          setActiveVoiceWave(false);
          setChatHistory(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: 'agent',
              text: '💡 **AI Listener Alert**: Call transcription finished. I have automatically updated your leak calculators, notes, domain entries, and subdomain records. Review the interactive guide on the right and click "Export Handover Report" when done.'
            }
          ]);
        }
      }, 4000); // Stream a line every 4 seconds
    } else {
      setActiveVoiceWave(false);
    }

    return () => clearInterval(intervalId);
  }, [isListening]);

  // Suggestion buttons listener
  const handleSuggestionClick = (type: string) => {
    let industryName = '';
    let offerPrice = '';
    let outreachFocus = '';
    let callObjective = '';

    if (type === 'real_estate') {
      industryName = 'Real Estate';
      offerPrice = '$299/mo (Entry Suite)';
      outreachFocus = 'WhatsApp Database Reactivation';
      callObjective = 'Discovery & Leak Audit';
    } else if (type === 'home_services') {
      industryName = 'Home Services';
      offerPrice = '$299/mo (Entry Suite)';
      outreachFocus = 'Missed-Call Text-Back';
      callObjective = 'Discovery & Leak Audit';
    } else if (type === 'dentistry') {
      industryName = 'Dentistry';
      offerPrice = '$497/mo (Growth Suite)';
      outreachFocus = 'WhatsApp Database Reactivation';
      callObjective = 'Discovery & Leak Audit';
    } else {
      // General Custom
      industryName = 'General B2B';
      offerPrice = '$299/mo (Entry Suite)';
      outreachFocus = 'Web Chat Triage';
      callObjective = 'Discovery & Leak Audit';
    }

    setSelections({
      industry: industryName,
      pricing: offerPrice,
      focus: outreachFocus,
      objective: callObjective
    });

    setChatHistory(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: 'user',
        text: `Configure meeting for ${industryName}`
      },
      {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: `🎯 Playbook configured for **${industryName}**!\n\nI have automatically structured the interactive call guide on the right:\n- **Pricing**: ${offerPrice}\n- **Outreach Hook**: ${outreachFocus}\n- **Call Type**: ${callObjective}\n\nYou can now fill out the client details manually or click **"Connect AI Listener"** to let me listen to the call and fill it in for you.`,
      }
    ]);
    setSurveyStep(5); // Completed
  };

  // Start guided questionnaire state machine
  const startQuestionnaire = () => {
    setSurveyStep(1);
    setChatHistory(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: 'user',
        text: 'Let\'s build a custom meeting structure'
      },
      {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: 'Step 1: Select the client\'s industry / niche below:',
        options: ['Real Estate', 'Home Services', 'Dentistry', 'Veterinary', 'Automotive', 'Other']
      }
    ]);
  };

  // State Machine response handler
  const handleSurveyOptionClick = (option: string) => {
    if (surveyStep === 1) {
      setSelections(prev => ({ ...prev, industry: option }));
      setSurveyStep(2);
      setChatHistory(prev => [
        ...prev,
        { id: crypto.randomUUID(), sender: 'user', text: option },
        {
          id: crypto.randomUUID(),
          sender: 'agent',
          text: `Great. What NWS SaaS package do you want to offer **${option}**?`,
          options: ['$299/mo (Entry Suite)', '$497/mo (Growth Suite)', '$997/mo (Premium Custom)']
        }
      ]);
    } else if (surveyStep === 2) {
      setSelections(prev => ({ ...prev, pricing: option }));
      setSurveyStep(3);
      setChatHistory(prev => [
        ...prev,
        { id: crypto.randomUUID(), sender: 'user', text: option },
        {
          id: crypto.randomUUID(),
          sender: 'agent',
          text: 'Understood. What will be the primary organic "foot-in-the-door" outreach focus for the chat widgets?',
          options: ['WhatsApp Database Reactivation', 'Missed-Call Text-Back', 'Web Chat Triage']
        }
      ]);
    } else if (surveyStep === 3) {
      setSelections(prev => ({ ...prev, focus: option }));
      setSurveyStep(4);
      setChatHistory(prev => [
        ...prev,
        { id: crypto.randomUUID(), sender: 'user', text: option },
        {
          id: crypto.randomUUID(),
          sender: 'agent',
          text: 'Excellent choice. Finally, what is the main objective of this meeting?',
          options: ['Discovery & Leak Audit', 'Technical Onboarding Setup', 'Live Launch Verification']
        }
      ]);
    } else if (surveyStep === 4) {
      setSelections(prev => ({ ...prev, objective: option }));
      setSurveyStep(5);
      
      // Update default parameters based on selections
      if (selections.industry === 'Automotive') {
        setValuePerJob(700);
        setMissedCallRate(25);
      } else if (selections.industry === 'Dentistry') {
        setValuePerJob(1500);
        setMissedCallRate(20);
      } else if (selections.industry === 'Real Estate') {
        setValuePerJob(15000);
        setMonthlyCalls(100);
      }

      setChatHistory(prev => [
        ...prev,
        { id: crypto.randomUUID(), sender: 'user', text: option },
        {
          id: crypto.randomUUID(),
          sender: 'agent',
          text: `🎉 **Custom Playbook Loaded!**\n\nThe interactive meeting guide is configured on the right. \n\n**Industry**: ${selections.industry}\n**Price Tier**: ${selections.pricing}\n**Hook**: ${option}\n\nStart the meeting with the prospect. You can click **"Connect AI Listener"** to parse the conversation automatically.`
        }
      ]);
    }
  };

  // Text chat input submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatInput('');

    setChatHistory(prev => [
      ...prev,
      { id: crypto.randomUUID(), sender: 'user', text: userText }
    ]);

    // Simple parser if not in state machine
    if (surveyStep === 0 || surveyStep === 5) {
      setTimeout(() => {
        let reply = '';
        if (userText.toLowerCase().includes('help') || userText.toLowerCase().includes('options')) {
          reply = 'I can help you build discovery scripts, calculate ROI leaks, or write onboarding notes. Try clicking **"Let\'s build a custom meeting structure"** to launch the interactive configurator.';
        } else if (userText.toLowerCase().includes('pricing') || userText.toLowerCase().includes('cost')) {
          reply = 'NWS provides standard subscriptions:\n- **Entry Suite**: $299/mo (No setup)\n- **Growth Suite**: $397-497/mo\n- **Premium Custom**: $597-997/mo ($500-1500 setup)\n- **Yext listings**: $297-497/mo. We do not provide marketing/ads retainers.';
        } else {
          reply = 'Understood. I am monitoring the active playbook config on the right. You can connect the call microphone anytime to let me help you fill out client forms and calculate revenue loss.';
        }

        setChatHistory(prev => [
          ...prev,
          { id: crypto.randomUUID(), sender: 'agent', text: reply }
        ]);
      }, 1000);
    }
  };

  // Reset page state
  const resetAll = () => {
    setChatHistory([
      {
        id: 'welcome',
        sender: 'agent',
        text: '👋 Welcome to the NWS Meeting Copilot. I can help you structure and run your sales/onboarding meetings in real-time. Choose a guide below or start typing to build a custom meeting structure.',
      }
    ]);
    setSelections({ industry: '', pricing: '', focus: '', objective: '' });
    setSurveyStep(0);
    setClientName('');
    setBusinessName('');
    setDomain('');
    setSubdomain('');
    setEmail('');
    setPhone('');
    setNotes('');
    setIsListening(false);
    setTranscript([]);
    setChecklist({
      hook: false,
      mathAudit: false,
      mechanismDemo: false,
      saasStack: false,
      dnsSubdomain: false,
      calendarConnect: false,
      reviewRules: false,
      leadConnectorApp: false
    });
  };

  // Calculation outputs
  const calculatedMissedCalls = Math.round(monthlyCalls * (missedCallRate / 100));
  const lostJobs = Math.round(calculatedMissedCalls * (bookingRate / 100));
  const lostRevenueValue = lostJobs * valuePerJob;

  const toggleChecklist = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeChecklistCount = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((activeChecklistCount / Object.keys(checklist).length) * 100);

  // Export Markdown Report file
  const exportHandoverReport = () => {
    const markdown = `# NWS Client Handover Specification Report
Generated: ${new Date().toLocaleDateString()}
Industry Niche: ${selections.industry || 'N/A'}
Objective: ${selections.objective || 'N/A'}
SaaS Plan: ${selections.pricing || 'N/A'}
Outreach Focus: ${selections.focus || 'N/A'}

## Client Profiles
* **Business Name**: ${businessName || 'N/A'}
* **Contact Owner**: ${clientName || 'N/A'}
* **Domain Name**: ${domain || 'N/A'}
* **Calendar Subdomain**: ${subdomain || 'N/A'}
* **Phone Number**: ${phone || 'N/A'}
* **Email Address**: ${email || 'N/A'}

## Calculated Revenue Leak Audit
* **Monthly Calls**: ${monthlyCalls}
* **Missed Call Rate**: ${missedCallRate}%
* **Calculated Missed Calls**: ${calculatedMissedCalls} / mo
* **Value per Client Job**: $${valuePerJob}
* **Estimated Monthly Loss**: $${lostRevenueValue.toLocaleString()} / mo

## Technical Checklist Status
${Object.entries(checklist).map(([key, val]) => `- [${val ? 'x' : ' '}] ${key.replace(/([A-Z])/g, ' $1')}`).join('\n')}

## Onboarding Conversation Notes
${notes || 'No specific notes recorded.'}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_meeting_report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--font-ui)',
      overflow: 'hidden'
    }}>
      
      {/* LEFT PANE: AI Chat Questionnaire & Suggestions (40% width) */}
      <div style={{
        width: '40%',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        
        {/* Banner Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
              <span>Discovery Agent</span>
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>Dynamic Playbook Builder</p>
          </div>
          <button 
            onClick={resetAll}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'transparent',
              fontSize: '0.75rem',
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Messages Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {chatHistory.map(msg => (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '0.75rem 1rem',
                borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.sender === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </div>

              {/* Multiple Choice Options */}
              {msg.options && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  maxWidth: '90%'
                }}>
                  {msg.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleSurveyOptionClick(opt)}
                      style={{
                        padding: '0.5rem 0.875rem',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: 'var(--accent)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                    >
                      <span>{opt}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Boxes Area (shown at start/restart) */}
        {surveyStep === 0 && (
          <div style={{
            padding: '1.25rem',
            borderTop: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.01)'
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suggested Starting Playbooks
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <button 
                onClick={() => handleSuggestionClick('real_estate')}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border 0.2s',
                  color: 'var(--text)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>🏠 Real Estate</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>WhatsApp Lead Reactivation</div>
              </button>

              <button 
                onClick={() => handleSuggestionClick('home_services')}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border 0.2s',
                  color: 'var(--text)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>🛠️ Home Services</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Missed-Call Text-Back Setup</div>
              </button>

              <button 
                onClick={() => handleSuggestionClick('dentistry')}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border 0.2s',
                  color: 'var(--text)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>🦷 Dentistry Practice</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Unaccepted Treatment Recall</div>
              </button>

              <button 
                onClick={startQuestionnaire}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border 0.2s',
                  color: 'var(--text)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background: 'linear-gradient(to right, rgba(99,102,241,0.05), transparent)'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Plus size={14} />
                  <span>Build Custom Spec</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Start the interactive 4-step survey</div>
              </button>
            </div>
          </div>
        )}

        {/* Input Form Box */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-2)'
        }}>
          <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask the meeting assistant or type custom specifications..."
              style={{
                flex: 1,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.625rem 0.875rem',
                color: 'var(--text)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--accent)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.625rem 1rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Send
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT PANE: Interactive Call Playbook & Form Fields (60% width) */}
      <div style={{
        width: '60%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg)'
      }}>

        {/* Header toolbar */}
        <div style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface)'
        }}>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={18} style={{ color: 'var(--success)' }} />
              <span>Interactive Meeting Guide & Workspace</span>
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
              Active Playbook: <strong style={{ color: 'var(--text)' }}>{selections.industry || 'No Playbook Configured'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={exportHandoverReport}
              style={{
                background: 'var(--accent)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                transition: 'opacity 0.2s'
              }}
            >
              <Download size={14} />
              <span>Export Specifications</span>
            </button>
          </div>
        </div>

        {/* Main Workspace Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          
          {/* Active Selections Metadata Widget */}
          {selections.industry && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Niche Focus</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{selections.industry}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Offered Price</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)' }}>{selections.pricing}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Primary Hook</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--warning)' }}>{selections.focus}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Goal Objective</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>{selections.objective}</span>
              </div>
            </div>
          )}

          {/* Progress Tracker bar */}
          {selections.industry && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>MEETING PROGRESS CHECKLIST</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{progressPercent}% COMPLETE</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(to right, var(--accent), #22c55e)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {!selections.industry ? (
            <div style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: '16px',
              color: 'var(--muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Activity size={32} style={{ color: 'var(--muted)' }} />
              <div>
                <h3 style={{ fontWeight: 600, color: 'var(--text)' }}>No Active Call Playbook</h3>
                <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Select one of the quick templates or build a custom spec on the Left Pane to begin.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Client Profile Intake Forms */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} style={{ color: 'var(--accent)' }} />
                  <span>Client Profile Information</span>
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.25rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Contact Owner Name</label>
                    <input 
                      type="text" 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)}
                      placeholder="e.g. Ronald"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Business/Practice Name</label>
                    <input 
                      type="text" 
                      value={businessName} 
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="e.g. Elite Plumbing"
                      style={{
                        background: 'var(--surface-2)',
                        border: highlightedFields.businessName ? '1px solid var(--warning)' : '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxShadow: highlightedFields.businessName ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Website Domain Name</label>
                    <input 
                      type="text" 
                      value={domain} 
                      onChange={e => setDomain(e.target.value)}
                      placeholder="e.g. eliteplumbingny.com"
                      style={{
                        background: 'var(--surface-2)',
                        border: highlightedFields.domain ? '1px solid var(--warning)' : '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxShadow: highlightedFields.domain ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Calendar Subdomain</label>
                    <input 
                      type="text" 
                      value={subdomain} 
                      onChange={e => setSubdomain(e.target.value)}
                      placeholder="e.g. booking.eliteplumbingny.com"
                      style={{
                        background: 'var(--surface-2)',
                        border: highlightedFields.subdomain ? '1px solid var(--warning)' : '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxShadow: highlightedFields.subdomain ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. info@eliteplumbing.com"
                      style={{
                        background: 'var(--surface-2)',
                        border: highlightedFields.email ? '1px solid var(--warning)' : '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxShadow: highlightedFields.email ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Phone Number</label>
                    <input 
                      type="text" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 555-0199"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Whiteboard Math Calculator */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calculator size={16} style={{ color: 'var(--accent)' }} />
                  <span>Whiteboard Lead Leak Calculator</span>
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Monthly Inbound Calls</label>
                    <input 
                      type="number" 
                      value={monthlyCalls} 
                      onChange={e => setMonthlyCalls(parseInt(e.target.value) || 0)}
                      style={{ background: 'var(--surface-2)', border: highlightedFields.monthlyCalls ? '1px solid var(--warning)' : '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Missed Call Rate (%)</label>
                    <input 
                      type="number" 
                      value={missedCallRate} 
                      onChange={e => setMissedCallRate(parseInt(e.target.value) || 0)}
                      style={{ background: 'var(--surface-2)', border: highlightedFields.missedCallRate ? '1px solid var(--warning)' : '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Booking Rate (%)</label>
                    <input 
                      type="number" 
                      value={bookingRate} 
                      onChange={e => setBookingRate(parseInt(e.target.value) || 0)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Close Rate (%)</label>
                    <input 
                      type="number" 
                      value={closeRate} 
                      onChange={e => setCloseRate(parseInt(e.target.value) || 0)}
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Value Per Ticket ($)</label>
                    <input 
                      type="number" 
                      value={valuePerJob} 
                      onChange={e => setValuePerJob(parseInt(e.target.value) || 0)}
                      style={{ background: 'var(--surface-2)', border: highlightedFields.valuePerJob ? '1px solid var(--warning)' : '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }} 
                    />
                  </div>
                </div>

                <div style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  textAlign: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Est. Missed Calls / Mo</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.25rem' }}>{calculatedMissedCalls}</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Est. Lost Bookings / Mo</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)', marginTop: '0.25rem' }}>{lostJobs}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Estimated Monthly Revenue Leak</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.25rem' }}>
                      ${lostRevenueValue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Call Execution SOP */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}>
                
                {/* 1. The Opening Hook */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>STAGE 1: Opening & Pure Tools Positioning</h4>
                    <button 
                      onClick={() => toggleChecklist('hook')} 
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: checklist.hook ? '#22c55e' : 'var(--muted)' }}
                    >
                      <CheckSquare size={20} fill={checklist.hook ? 'rgba(34, 197, 94, 0.1)' : 'transparent'} />
                    </button>
                  </div>
                  
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    Frame NWS strictly as a software and systems setup partner (GHL tools and means), not an ads agency.
                  </p>
                  
                  <div style={{
                    background: 'var(--surface-2)',
                    borderLeft: '4px solid var(--accent)',
                    padding: '1rem',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '0.875rem',
                    fontStyle: 'italic',
                    lineHeight: 1.6
                  }}>
                    "Thanks for connecting today! I want to clarify from the start: We aren't a traditional marketing agency trying to sell you paid ad campaigns, SEO, or social media management services. We are Digital Architects. We construct the software platform, widgets, and messaging tools you need to automatically catch existing leaks. Let's inspect your current setup."
                  </div>
                </div>

                {/* 2. Pitching the Mechanism */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>STAGE 2: Demo the Organic Mechanism</h4>
                    <button 
                      onClick={() => toggleChecklist('mechanismDemo')} 
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: checklist.mechanismDemo ? '#22c55e' : 'var(--muted)' }}
                    >
                      <CheckSquare size={20} fill={checklist.mechanismDemo ? 'rgba(34, 197, 94, 0.1)' : 'transparent'} />
                    </button>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    Demo standard GHL widgets. Explain manual CSV uploads as the reactivation mechanism instead of DMS direct coding.
                  </p>

                  <div style={{
                    background: 'var(--surface-2)',
                    borderLeft: '4px solid var(--warning)',
                    padding: '1rem',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '0.875rem',
                    fontStyle: 'italic',
                    lineHeight: 1.6
                  }}>
                    "Instead of complex, expensive database integrations that break constantly, we set up a simple daily or weekly manual CSV list export procedure. You pull safety declines or past leads, upload them, and trigger our custom WhatsApp workflows. Let's do a live test. Grab your phone and text this demo line..."
                  </div>
                </div>

                {/* 3. Onboarding Configuration Checklists */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>STAGE 3: Technical Handover Parameters (Extendly Handoff)</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checklist.dnsSubdomain} onChange={() => toggleChecklist('dnsSubdomain')} style={{ accentColor: 'var(--accent)' }} />
                      <span>DNS & subdomain mapped (e.g. booking.${domain || 'clientdomain.com'})</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checklist.calendarConnect} onChange={() => toggleChecklist('calendarConnect')} style={{ accentColor: 'var(--accent)' }} />
                      <span>CRM calendars connected to GHL users (Google / Outlook Calendars)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checklist.reviewRules} onChange={() => toggleChecklist('reviewRules')} style={{ accentColor: 'var(--accent)' }} />
                      <span>Review AI rating rules defined (Auto-forward 4-5 stars; Triage 1-3 stars internally)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checklist.leadConnectorApp} onChange={() => toggleChecklist('leadConnectorApp')} style={{ accentColor: 'var(--accent)' }} />
                      <span>LeadConnector mobile application downloaded on customer's phone</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Dynamic Call Notes */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
                  <span>Call Notes & Specific Instructions</span>
                </h3>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Record customer objections, custom Aria voice prompt parameters, or specific GHL instructions spoken on the call..."
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: highlightedFields.notes ? '1px solid var(--warning)' : '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none',
                    boxShadow: highlightedFields.notes ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'none',
                    transition: 'all 0.3s'
                  }}
                />
              </div>
            </>
          )}

        </div>

        {/* BOTTOM PANEL: Simulated Live AI Call Listener Widget */}
        {selections.industry && (
          <div style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            padding: '1.25rem 2rem',
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
            height: '140px'
          }}>
            
            {/* Listening Trigger Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '220px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isListening ? '#22c55e' : '#64748b',
                  boxShadow: isListening ? '0 0 8px #22c55e' : 'none',
                  animation: isListening ? 'blink 1.5s infinite' : 'none'
                }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>
                  {isListening ? 'AI Listener Active' : 'AI On-Call Note-Taker'}
                </span>
              </div>
              
              <button
                onClick={() => setIsListening(!isListening)}
                style={{
                  background: isListening ? '#f43f5e' : 'var(--accent)',
                  color: 'var(--text)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.625rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
              >
                {isListening ? (
                  <>
                    <Square size={14} />
                    <span>Disconnect AI</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Connect AI to Call</span>
                  </>
                )}
              </button>
            </div>

            {/* Audio Wave Visualizer Panel */}
            <div style={{
              flex: 1,
              height: '80px',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              background: 'var(--surface-2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              
              {/* Header Title */}
              <div style={{
                position: 'absolute',
                top: '0.375rem',
                left: '0.75rem',
                fontSize: '0.6875rem',
                color: 'var(--muted)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                zIndex: 10
              }}>
                <Activity size={10} />
                <span>LIVE VOICE TRANSCRIPT ENGINE</span>
              </div>

              {/* Wave & Text Stream Container */}
              <div style={{
                display: 'flex',
                height: '100%',
                alignItems: 'center',
                padding: '1.25rem 0.75rem 0.5rem 0.75rem',
                gap: '1rem'
              }}>
                {/* Visual sound bars */}
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', width: '60px', height: '30px', flexShrink: 0 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(bar => {
                    const randomHeight = isListening ? Math.floor(Math.random() * 26) + 4 : 4;
                    return (
                      <div 
                        key={bar} 
                        style={{
                          width: '4px',
                          height: `${randomHeight}px`,
                          background: isListening ? 'var(--accent)' : 'var(--border)',
                          borderRadius: '2px',
                          transition: 'height 0.15s ease'
                        }} 
                      />
                    );
                  })}
                </div>

                {/* Transcript text content */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  height: '100%',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  color: 'var(--muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem',
                  paddingRight: '0.5rem'
                }}>
                  {transcript.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', color: 'var(--muted)', fontStyle: 'italic' }}>
                      Connect the AI note-taker and run the meeting to see the live transcript and auto-fill in action.
                    </div>
                  ) : (
                    transcript.map((line, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: line.sender === 'Ronald' ? 'var(--accent)' : 'var(--success)', fontWeight: 700, width: '45px', flexShrink: 0 }}>
                          [{line.sender}]:
                        </span>
                        <span style={{ color: line.detectedField ? 'var(--text)' : 'inherit', background: line.detectedField ? 'rgba(245, 158, 11, 0.1)' : 'transparent', padding: line.detectedField ? '1px 4px' : 0, borderRadius: '4px' }}>
                          {line.text}
                        </span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--muted)', marginLeft: 'auto' }}>{line.timestamp}</span>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
      <style>{`@keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  );
}
