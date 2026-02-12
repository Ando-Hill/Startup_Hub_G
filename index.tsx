import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { Send, Sparkles, Target, Users, LayoutGrid, ArrowRight, Loader2, Plus, Paperclip, X, Edit3, Check, Upload, Trash2, CornerDownLeft, Briefcase, Layers, ChevronRight, Hexagon, Globe, ShieldCheck, Building2, FileText, User, Camera, ZoomIn, ZoomOut, Move, Mail, Settings, Search, UserCircle, MapPin, ArrowUpRight, Filter, MessageSquare, Star, ThumbsUp, ThumbsDown, Zap, ExternalLink, Shield, CheckCircle2, XCircle } from 'lucide-react';

// --- Types ---

interface SecondMeUser {
  name: string;
  email: string;
  avatar: string;
  bio: string;
}

interface ProjectData {
  id?: string;
  name: string;
  oneLiner: string;
  sector: string;
  location: string;
  stage: string;
  vision: string;
  problem: string;
  solution: string;
  talentNeeds: string[];
  productHighlights: string;
  targetAudience: string;
  businessModel: string;
  differentiation: string;
  marketSize: string;
  teamMembers: string;
  whyNow: string;
  longTermMoat: string;
  roadmapFinance: string;
  others: string;
  owner?: { name: string; avatar: string }; // Extended for listing
}

interface ProfileData {
  name: string;
  title: string;
  location: string;
  bio: string;
  skills: string[];
  experienceHighlights: string;
  education: string;
  lookingFor: string; 
  superpower: string; 
  others: string;
  avatar: string; 
}

interface ServiceData {
  id: string;
  name: string;
  category: string;
  description: string;
  services: string[];
  city: string;
  contact: string;
  website: string;
}

interface InboxSession {
  id: string;
  targetId: string;
  targetName: string;
  targetType: 'user' | 'project';
  targetAvatar?: string;
  messages: {
    id: string;
    sender: 'user' | 'other';
    content: string;
    timestamp: number;
  }[];
  updatedAt: number;
}

interface MatchResult {
  id: string;
  name: string;
  titleOrSector: string; // Job Title for talent, Sector for project
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
  type: 'talent' | 'project';
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Attachment {
  name: string;
  data: string;
  mimeType: string;
}

interface Annotation {
  id: string;
  field: string;
  selectedText: string;
  comment: string;
  timestamp: number;
}

// --- Initial Data ---

const initialProjectData: ProjectData = {
  name: "", oneLiner: "", sector: "", location: "", stage: "", vision: "", problem: "", solution: "", talentNeeds: [],
  productHighlights: "", targetAudience: "", businessModel: "", differentiation: "", marketSize: "", teamMembers: "",
  whyNow: "", longTermMoat: "", roadmapFinance: "", others: ""
};

const initialProfileData: ProfileData = {
  name: "", title: "", location: "", bio: "", skills: [], experienceHighlights: "", education: "", lookingFor: "", superpower: "", others: "", avatar: ""
};

// --- Mock Data Generators for New Pages ---

const mockProjects: ProjectData[] = [
  { ...initialProjectData, id: '1', name: "Nebula AI", oneLiner: "Generative AI for personalized education.", sector: "EdTech", stage: "Seed", talentNeeds: ["CTO", "Lead AI Engineer"], location: "Beijing", owner: { name: "Li Ming", avatar: "" } },
  { ...initialProjectData, id: '2', name: "GreenLoop", oneLiner: "Circular economy logistics platform.", sector: "CleanTech", stage: "Angel", talentNeeds: ["COO", "Supply Chain Expert"], location: "Shanghai", owner: { name: "Sarah Chen", avatar: "" } },
  { ...initialProjectData, id: '3', name: "MedSynthetix", oneLiner: "Synthetic data for medical research privacy.", sector: "HealthTech", stage: "Series A", talentNeeds: ["Sales Director"], location: "Hangzhou", owner: { name: "Dr. Wang", avatar: "" } },
  { ...initialProjectData, id: '4', name: "Orbital Edge", oneLiner: "Edge computing for satellite constellations.", sector: "DeepTech", stage: "Pre-Seed", talentNeeds: ["Embedded Engineer", "Co-founder"], location: "Shenzhen", owner: { name: "Alex Z", avatar: "" } },
];

const mockServices: ServiceData[] = [
  { id: '1', name: "Bright Law", category: "Legal", description: "Specialized legal counsel for TMT startups and cross-border structuring.", services: ["Incorporation", "IP Protection", "Option Pools"], city: "Beijing", contact: "hi@brightlaw.cn", website: "brightlaw.cn" },
  { id: '2', name: "Pixel Perfect", category: "Design", description: "Award-winning UI/UX studio for SaaS products.", services: ["Product Design", "Branding", "Webflow Dev"], city: "Shanghai", contact: "studio@pixel.com", website: "pixel.com" },
  { id: '3', name: "CloudScale", category: "DevOps", description: "AWS/AliCloud infrastructure management for high-growth apps.", services: ["Cloud Architecture", "Security Audit"], city: "Remote", contact: "ops@cloudscale.io", website: "cloudscale.io" },
  { id: '4', name: "TalentScout", category: "Recruiting", description: "Executive search for C-level tech talent.", services: ["Headhunting", "Team Building"], city: "Shenzhen", contact: "hr@talentscout.cn", website: "talentscout.cn" },
];

const mockSessions: InboxSession[] = [
  {
    id: 's1', targetId: 'u2', targetName: "Sarah Chen", targetType: 'user', targetAvatar: '', updatedAt: Date.now(),
    messages: [
      { id: 'm1', sender: 'other', content: "Hi! I saw your profile and I'm interested in your background.", timestamp: Date.now() - 100000 },
      { id: 'm2', sender: 'user', content: "Thanks Sarah! Would love to hear more about GreenLoop.", timestamp: Date.now() - 50000 },
    ]
  },
  {
    id: 's2', targetId: 'p1', targetName: "Nebula AI Team", targetType: 'project', targetAvatar: '', updatedAt: Date.now() - 200000,
    messages: [
      { id: 'm1', sender: 'user', content: "Is the CTO position still open?", timestamp: Date.now() - 200000 },
    ]
  }
];

// --- Gemini Configurations ---

const PROJECT_SYSTEM_INSTRUCTION = `
You are a seasoned Startup Co-founder and Interviewer. Help a founder articulate their project vision.
Output JSON: { "reply": "string", "updates": { ...partial ProjectData... } }
CRITICAL: You must aggressively extract and populate the following fields in the 'updates' object whenever relevant information is shared:
- productHighlights (What is the product?)
- targetAudience (Who is it for?)
- businessModel (How does it make money?)
- differentiation (Unfair advantage)
- marketSize (TAM/SAM/SOM)
- teamMembers (Current team)
- whyNow (Why is this the right time?)
- longTermMoat (Defensibility)
- roadmapFinance (Funding & Timeline)
- others (Any important information that does not fit into the above specific fields, organized clearly)

Also extract: name, oneLiner, sector, location, stage, vision, problem, solution, talentNeeds.
Tone: Intellectual, trustworthy, reminiscent of Paul Graham.

LANGUAGE INSTRUCTION: You MUST detect the language of the user's input (or uploaded file). If the user speaks Chinese (or uploads Chinese content), your 'reply' MUST be in Chinese. If the user speaks English, reply in English. Do not default to English if the input is Chinese.
`;

const PROFILE_SYSTEM_INSTRUCTION = `
You are a top-tier Talent Agent and Career Coach. Help a talent articulate their unique value proposition.
Output JSON: { "reply": "string", "updates": { ...partial ProfileData... } }
Focus on extracting: name, title (e.g. Senior Engineer), location, bio, skills (array), experienceHighlights, education, lookingFor, superpower.
Tone: Encouraging, sharp, focused on highlighting strengths.

LANGUAGE INSTRUCTION: You MUST detect the language of the user's input (or uploaded file). If the user speaks Chinese (or uploads Chinese content), your 'reply' MUST be in Chinese. If the user speaks English, reply in English. Do not default to English if the input is Chinese.
`;

// --- Shared Components ---

const HighlightableText = ({ 
  text, field, annotations, onSelection 
}: { 
  text: string, field: string, annotations: Annotation[], 
  onSelection: (field: string, text: string, rect: DOMRect) => void 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0 && containerRef.current?.contains(selection.anchorNode)) {
       onSelection(field, selectedText, rect);
    }
  };
  
  const renderHighlightedText = () => {
    if (!text) return <span className="text-gray-400 italic">Content pending...</span>;
    if (annotations.length === 0) return text;
    
    const fieldAnnotations = annotations.filter(a => a.field === field && text.includes(a.selectedText));
    if (fieldAnnotations.length === 0) return text;
    fieldAnnotations.sort((a, b) => text.indexOf(a.selectedText) - text.indexOf(b.selectedText));
    let lastIndex = 0;
    const elements: React.ReactNode[] = [];
    fieldAnnotations.forEach((ann, idx) => {
      const startIndex = text.indexOf(ann.selectedText, lastIndex);
      if (startIndex === -1) return; 
      if (startIndex > lastIndex) elements.push(text.substring(lastIndex, startIndex));
      elements.push(
        <span key={ann.id} className="bg-yellow-100 border-b-2 border-yellow-300 relative group cursor-pointer">
          {ann.selectedText}
          <sup className="bg-accent-red text-white text-[9px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center -top-2 ml-0.5 shadow-sm select-none">{annotations.findIndex(a => a.id === ann.id) + 1}</sup>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-ink text-white text-xs p-2 rounded shadow-xl z-50 pointer-events-none whitespace-normal">
             {ann.comment}
          </div>
        </span>
      );
      lastIndex = startIndex + ann.selectedText.length;
    });
    if (lastIndex < text.length) elements.push(text.substring(lastIndex));
    return elements;
  };

  return <div ref={containerRef} onMouseUp={handleMouseUp} className="relative inline">{renderHighlightedText()}</div>;
};

const AnnotationBubble = ({ rect, onSave, onCancel }: { rect: DOMRect | null, onSave: (c: string) => void, onCancel: () => void }) => {
  const [comment, setComment] = useState("");
  if (!rect) return null;
  const top = rect.top + window.scrollY - 10;
  const left = rect.left + window.scrollX + (rect.width / 2);
  return (
    <div className="fixed z-[100] transform -translate-x-1/2 -translate-y-full bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64 animate-in fade-in zoom-in-95" style={{ top, left }}>
      <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-ink">Add Note</span><button onClick={onCancel}><X className="w-3 h-3"/></button></div>
      <textarea className="w-full text-sm border p-2 h-20 mb-2 font-sans focus:outline-none focus:border-ink" value={comment} onChange={e=>setComment(e.target.value)} autoFocus placeholder="Your feedback..." />
      <button onClick={()=>onSave(comment)} disabled={!comment.trim()} className="bg-ink text-white px-3 py-1 rounded text-xs w-full hover:bg-ink-light transition-colors">Save</button>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white border-b border-r border-gray-200"></div>
    </div>
  );
};

const AIChat = ({ messages, onSendMessage, loading, persona }: { messages: Message[], onSendMessage: (text: string, att?: Attachment|null) => void, loading: boolean, persona: string }) => {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if ((input.trim() || attachment) && !loading) {
      onSendMessage(input, attachment);
      setInput("");
      setAttachment(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
      if(textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => setAttachment({ name: file.name, data: (ev.target?.result as string).split(',')[1], mimeType: file.type });
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-border relative">
      <div className="p-4 border-b border-border flex items-center justify-between bg-paper/50 flex-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center shadow-lg"><Sparkles className="w-5 h-5" /></div>
          <div><div className="font-serif font-bold text-ink">{persona}</div><div className="text-xs flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-green-500 animate-pulse'}`}></span><span className={loading ? 'text-orange-600' : 'text-green-600'}>{loading ? 'Thinking...' : 'Online'}</span></div></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans ${msg.role === 'user' ? 'bg-ink text-white rounded-br-none' : 'bg-white border border-border text-ink rounded-bl-none'}`}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white border border-border text-ink rounded-xl rounded-bl-none p-4 shadow-sm flex items-center gap-2 text-sm">
                <Loader2 className="animate-spin w-4 h-4 text-ink-light"/>
                <span className="text-ink-light italic">Processing...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-border bg-white flex flex-col gap-2">
        {attachment && <div className="text-xs bg-gray-100 p-2 rounded flex justify-between items-center border border-gray-200"><span className="flex items-center gap-1"><Paperclip className="w-3 h-3"/> {attachment.name}</span> <button onClick={()=>setAttachment(null)}><X className="w-3 h-3"/></button></div>}
        <div className="flex gap-2 items-end bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-1 focus-within:ring-ink transition-all">
          <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept=".pdf,.doc,.docx,.txt,.md" />
          <button onClick={()=>fileInputRef.current?.click()} className="p-2 text-ink-light hover:text-ink hover:bg-gray-200 rounded transition-colors flex-shrink-0"><Paperclip className="w-5 h-5"/></button>
          <textarea 
            ref={textareaRef}
            value={input} 
            onChange={e=>setInput(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder="Type here..." 
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-ink text-sm font-sans placeholder:text-gray-400 focus:outline-none" 
            rows={1}
          />
          <button onClick={handleSend} disabled={loading} className="p-2 bg-ink text-white rounded hover:bg-ink-light disabled:opacity-50 transition-colors shadow-sm flex-shrink-0"><Send className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );
};

// --- Avatar Cropper Component ---

const AvatarCropper = ({ imageSrc, onCancel, onSave }: { imageSrc: string, onCancel: () => void, onSave: (data: string) => void }) => {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const CROP_SIZE = 250;

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPos(p => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setDragging(false);

  const handleSave = () => {
    const canvas = document.createElement('canvas');
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx && imgRef.current) {
       ctx.fillStyle = '#FFFFFF';
       ctx.fillRect(0,0,CROP_SIZE,CROP_SIZE);
       
       ctx.save();
       // Center align
       ctx.translate(CROP_SIZE/2 + pos.x, CROP_SIZE/2 + pos.y);
       ctx.scale(scale, scale);
       ctx.drawImage(imgRef.current, -imgRef.current.naturalWidth / 2, -imgRef.current.naturalHeight / 2);
       ctx.restore();
       onSave(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
       <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md animate-in fade-in zoom-in-95">
          <div className="p-4 border-b border-border flex justify-between items-center">
             <h3 className="font-serif font-bold text-ink">Edit Profile Picture</h3>
             <button onClick={onCancel}><X className="w-5 h-5 text-ink-light hover:text-ink"/></button>
          </div>
          
          <div className="p-8 flex flex-col items-center gap-6 bg-paper-texture">
             <div 
               className="w-[250px] h-[250px] border-2 border-dashed border-ink/30 rounded-full overflow-hidden relative cursor-move shadow-inner bg-gray-100"
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
             >
                {/* Visual Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 rounded-full border border-white/50"></div>
                
                <img 
                  ref={imgRef}
                  src={imageSrc} 
                  alt="Crop Target" 
                  className="max-w-none absolute top-1/2 left-1/2 select-none"
                  style={{ 
                    transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
                    pointerEvents: 'none'
                  }}
                  draggable={false}
                />
             </div>
             
             <div className="flex items-center gap-4 w-full max-w-[250px]">
                <ZoomOut className="w-4 h-4 text-ink-light" />
                <input 
                  type="range" 
                  min="0.5" 
                  max="3" 
                  step="0.05" 
                  value={scale} 
                  onChange={(e) => setScale(parseFloat(e.target.value))} 
                  className="flex-1 accent-ink cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-ink-light" />
             </div>
             
             <p className="text-xs text-ink-light flex items-center gap-1"><Move className="w-3 h-3"/> Drag to position</p>
          </div>

          <div className="p-4 border-t border-border bg-gray-50 flex gap-3">
             <button onClick={onCancel} className="flex-1 py-2 text-sm font-medium text-ink-light hover:text-ink hover:bg-gray-200 rounded transition-colors">Cancel</button>
             <button onClick={handleSave} className="flex-1 py-2 text-sm font-medium bg-ink text-white hover:bg-ink-light rounded shadow-lg transition-colors">Save Photo</button>
          </div>
       </div>
    </div>
  );
};

// --- Restored Project Components ---

const DetailBlock = ({ 
  label, subLabel, field, data, annotations, onSelection 
}: { 
  label: string, subLabel?: string, field: keyof ProjectData, data: ProjectData, annotations: Annotation[], onSelection: (field: string, text: string, rect: DOMRect) => void 
}) => {
  const content = data[field] as string;
  const isPending = !content || content === "";

  return (
    <div className="space-y-2 group">
      <div className="flex items-baseline gap-2 border-b border-transparent group-hover:border-gray-100 transition-colors pb-1">
        <h3 className="text-xs font-bold font-sans uppercase tracking-widest text-ink">{label}</h3>
        {subLabel && <span className="text-[10px] text-gray-400 font-serif italic">{subLabel}</span>}
      </div>
      <div className="text-sm md:text-base leading-relaxed text-ink/80 min-h-[3rem]">
        {isPending ? (
          <div className="text-gray-300 text-xs italic border-b border-dashed border-gray-200 inline-block w-full py-1">Pending...</div>
        ) : (
          <HighlightableText text={content} field={field} annotations={annotations} onSelection={onSelection} />
        )}
      </div>
    </div>
  );
};

const ProjectArtifact = ({ 
  data, annotations, onAddAnnotation 
}: { 
  data: ProjectData, annotations: Annotation[], onAddAnnotation: (field: string, text: string, rect: DOMRect) => void 
}) => {
  const isEmpty = (str: string) => !str || str.trim() === "";
  // Ensure talentNeeds is an array to avoid map errors
  const talentNeeds = Array.isArray(data.talentNeeds) ? data.talentNeeds : [];

  return (
    <div className="bg-white/80 backdrop-blur-sm shadow-paper border border-border p-8 md:p-12 min-h-[800px] relative pb-32">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <img src="https://www.svgrepo.com/show/530573/conversation.svg" className="w-32 h-32" alt="watermark" />
      </div>
      
      {/* Header Section */}
      <div className="border-b-2 border-ink pb-8 mb-8">
        <div className="flex justify-between items-start">
          <div className="space-y-4 max-w-[80%]">
            <div className="text-xs font-sans font-bold tracking-[0.2em] text-accent-red uppercase mb-2">Project Manifest</div>
            {isEmpty(data.name) ? (
              <div className="h-12 bg-gray-100 rounded animate-pulse w-2/3"></div>
            ) : (
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink leading-tight">
                <HighlightableText text={data.name} field="name" annotations={annotations} onSelection={onAddAnnotation} />
              </h1>
            )}
            
            {isEmpty(data.oneLiner) ? (
              <div className="h-6 bg-gray-100 rounded animate-pulse w-full mt-4"></div>
            ) : (
              <p className="text-xl text-ink-light italic font-serif mt-2">
                "<HighlightableText text={data.oneLiner} field="oneLiner" annotations={annotations} onSelection={onAddAnnotation} />"
              </p>
            )}
          </div>
          
          <div className="border border-ink p-3 w-32 flex flex-col gap-2 items-center justify-center bg-paper rotate-[-2deg] shadow-sm">
            <div className="text-[10px] font-sans uppercase tracking-widest text-ink-light text-center border-b border-ink/20 pb-1 w-full">Status</div>
            <div className="font-bold font-serif text-center text-sm">{data.stage || "Drafting"}</div>
            <div className="w-full h-px bg-ink/20"></div>
            <div className="font-bold font-serif text-center text-accent-blue text-xs">{data.location || "China"}</div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
           {data.sector && (
             <span className="px-3 py-1 bg-ink text-white text-xs font-sans tracking-wide rounded-full">
               {data.sector}
             </span>
           )}
        </div>
      </div>

      {/* Core Content */}
      <div className="space-y-12">
        
        {/* Section 1: Vision */}
        <section>
          <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-4 border-l-4 border-accent-red pl-3">
            <Target className="w-5 h-5 text-accent-red" />
            The Vision (愿景)
          </h2>
          {isEmpty(data.vision) ? (
            <div className="p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm font-sans text-center">
              Tell the AI about the future you are building...
            </div>
          ) : (
            <p className="text-lg leading-relaxed text-ink/90 whitespace-pre-wrap">
              <HighlightableText text={data.vision} field="vision" annotations={annotations} onSelection={onAddAnnotation} />
            </p>
          )}
        </section>

        {/* Section 2: Problem & Solution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-sm font-bold font-sans uppercase tracking-widest text-ink-light mb-3">The Problem</h3>
            {isEmpty(data.problem) ? (
              <div className="h-24 bg-gray-50 border border-dashed border-gray-300 rounded-lg"></div>
            ) : (
              <p className="text-base leading-relaxed text-ink/80">
                 <HighlightableText text={data.problem} field="problem" annotations={annotations} onSelection={onAddAnnotation} />
              </p>
            )}
          </section>
          <section>
            <h3 className="text-sm font-bold font-sans uppercase tracking-widest text-ink-light mb-3">The Solution</h3>
            {isEmpty(data.solution) ? (
              <div className="h-24 bg-gray-50 border border-dashed border-gray-300 rounded-lg"></div>
            ) : (
              <p className="text-base leading-relaxed text-ink/80">
                 <HighlightableText text={data.solution} field="solution" annotations={annotations} onSelection={onAddAnnotation} />
              </p>
            )}
          </section>
        </div>

        {/* Section 3: Talent Needs */}
        <section>
          <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-6 border-l-4 border-accent-blue pl-3">
            <Users className="w-5 h-5 text-accent-blue" />
            Who We Are Looking For (寻找同路人)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {talentNeeds.length === 0 ? (
              <div className="col-span-2 p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm font-sans text-center">
                Describe the key roles or traits you need...
              </div>
            ) : (
              talentNeeds.map((role, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 border border-border bg-white shadow-sm rounded transition hover:border-accent-blue group">
                  <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-ink font-serif font-bold group-hover:bg-accent-blue group-hover:text-white transition-colors">
                    {idx + 1}
                  </div>
                  <span className="font-serif text-lg">{role}</span>
                </div>
              ))
            )}
            
            {talentNeeds.length > 0 && (
              <div className="flex items-center justify-center p-4 border border-dashed border-gray-300 rounded cursor-not-allowed opacity-50">
                <Plus className="w-5 h-5 mr-2" />
                <span className="text-sm font-sans">Add via Chat</span>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Project Details */}
        <section>
           <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-6 border-l-4 border-ink pl-3">
            <Briefcase className="w-5 h-5 text-ink" />
            Project Details (项目详情)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <DetailBlock label="What" subLabel="产品功能" field="productHighlights" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            <DetailBlock label="Target Audience" subLabel="用户群体" field="targetAudience" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            <DetailBlock label="Commercial Essence" subLabel="商业模式" field="businessModel" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            <DetailBlock label="Differentiation" subLabel="差异化" field="differentiation" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            <DetailBlock label="Market Size" subLabel="市场规模" field="marketSize" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            <DetailBlock label="Team" subLabel="已有成员" field="teamMembers" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            <DetailBlock label="Why Now" subLabel="时机" field="whyNow" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            <DetailBlock label="Long-term Moat" subLabel="长期壁垒" field="longTermMoat" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            
            <div className="md:col-span-2 mt-4 pt-4 border-t border-dashed border-gray-200">
              <DetailBlock label="Roadmap & Finance" subLabel="融资与规划" field="roadmapFinance" data={data} annotations={annotations} onSelection={onAddAnnotation} />
            </div>
          </div>
        </section>

        {/* Section 5: Others */}
        <section className="pt-8 border-t border-ink/10">
           <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-6 border-l-4 border-gray-500 pl-3">
            <Layers className="w-5 h-5 text-gray-500" />
            Other Things (其他内容)
          </h2>
          {isEmpty(data.others) ? (
            <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm font-sans">
              Any other details will appear here...
            </div>
          ) : (
             <p className="text-base leading-relaxed text-ink/80">
               <HighlightableText text={data.others} field="others" annotations={annotations} onSelection={onAddAnnotation} />
             </p>
          )}
        </section>

        {/* Footer Signature Area */}
        <div className="mt-16 pt-8 border-t-2 border-ink flex justify-between items-end">
          <div>
            <div className="text-xs font-sans text-gray-400 mb-1">Created on</div>
            <div className="font-mono text-sm">{new Date().toLocaleDateString()}</div>
          </div>
          <div className="text-right">
            <div className="font-cursive text-2xl text-ink/60 mb-1 font-serif italic">Verified by AI Hub</div>
            <div className="h-px w-32 bg-ink/60 ml-auto"></div>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Page Components ---

const GeometricDecorations = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="absolute -top-[200px] -right-[200px] w-[800px] h-[800px] rounded-full border border-ink/10 opacity-60"></div>
    <div className="absolute -top-[150px] -right-[150px] w-[700px] h-[700px] rounded-full border border-dashed border-ink/20 opacity-40 animate-[spin_120s_linear_infinite]"></div>
    <div className="absolute top-[200px] right-[200px] w-12 h-12 bg-orange-300 rounded-full opacity-70 translate-x-1/2 -translate-y-1/2 shadow-lg shadow-orange-200/50"></div>
    <div className="absolute top-0 left-[10%] w-px h-full bg-ink/10 hidden md:block"></div>
    <div className="absolute top-0 right-[10%] w-px h-full bg-ink/10 hidden md:block"></div>
    <div className="absolute top-[30%] left-0 w-full h-px bg-ink/10"></div>
    <div className="absolute -bottom-[50px] -left-[50px] w-64 h-64 border border-ink/10 rotate-12 opacity-50"></div>
  </div>
);

// 1. Role Selection Page
const RoleSelectionPage = ({ 
  onNavigate, 
  onAuthSuccess,
  user 
}: { 
  onNavigate: (view: 'project_create' | 'profile_create') => void, 
  onAuthSuccess: (user: SecondMeUser) => void,
  user: SecondMeUser | null
}) => {
  const [selectedRole, setSelectedRole] = useState<'founder' | 'talent' | null>(null);
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isExpanded, setIsExpanded] = useState(false);

  const performAuth = (role: 'founder' | 'talent') => {
    setAuthStatus('loading');
    
    // Simulate SecondMe Authentication API
    setTimeout(() => {
       const isSuccess = true; // Simulating success
       
       if (isSuccess) {
         const newUser: SecondMeUser = {
           name: "Alex Chen",
           email: "alex.chen@second.me",
           avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Alex",
           bio: "Building the future of work. Previously at TechFlow."
         };
         setAuthStatus('success');
         setIsExpanded(true); // Full card initially
         onAuthSuccess(newUser);

         // Collapse after 2 seconds
         setTimeout(() => {
             setIsExpanded(false);
         }, 2000);
         
         // No auto navigation - allow user to see card and interact
       } else {
         setAuthStatus('error');
         setTimeout(() => setAuthStatus('idle'), 3000);
       }
    }, 2000);
  };

  const handleFounderClick = () => {
    if (user) setSelectedRole('founder');
    else performAuth('founder');
  };
  
  const handleTalentClick = () => {
    if (user) onNavigate('profile_create');
    else performAuth('talent');
  };
  
  const handleFounderAction = (action: 'project' | 'profile') => {
    if (action === 'project') onNavigate('project_create');
    else onNavigate('profile_create');
  };

  return (
    <div className="flex flex-col min-h-full items-center justify-center bg-paper-texture relative p-4">
      <GeometricDecorations />
      
      {/* Auth Loading Overlay */}
      {authStatus === 'loading' && (
        <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
           <Loader2 className="w-12 h-12 text-ink animate-spin mb-4" />
           <p className="text-lg font-serif text-ink font-bold">Verifying SecondMe Identity...</p>
           <p className="text-sm text-gray-500">Connecting to secure vault</p>
        </div>
      )}

      <div className="z-10 w-full max-w-4xl animate-in fade-in duration-500">
        <div className="text-center mb-12 space-y-4">
           <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink">Choose Your Path</h1>
           <p className="text-ink-light font-sans text-lg">How will you contribute to the future?</p>
        </div>

        {selectedRole === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button onClick={handleFounderClick} disabled={authStatus === 'loading'} className="group relative bg-white border border-border p-8 rounded-xl shadow-paper hover:shadow-float transition-all hover:-translate-y-1 text-left disabled:opacity-50 disabled:cursor-wait">
               <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mb-6 group-hover:bg-ink group-hover:text-white transition-colors">
                  <Briefcase className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-serif font-bold text-ink mb-2">I am a Founder</h3>
               <p className="text-ink-light text-sm leading-relaxed">I have a vision and I'm looking for builders to bring it to life. I need to recruit a team.</p>
               <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider text-accent-red opacity-0 group-hover:opacity-100 transition-opacity">
                  Select <ArrowRight className="w-4 h-4 ml-2" />
               </div>
            </button>

            <button onClick={handleTalentClick} disabled={authStatus === 'loading'} className="group relative bg-white border border-border p-8 rounded-xl shadow-paper hover:shadow-float transition-all hover:-translate-y-1 text-left disabled:opacity-50 disabled:cursor-wait">
               <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mb-6 group-hover:bg-accent-blue group-hover:text-white transition-colors">
                  <User className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-serif font-bold text-ink mb-2">I am a Talent</h3>
               <p className="text-ink-light text-sm leading-relaxed">I have exceptional skills and I'm looking for a high-potential ship to board.</p>
               <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity">
                  Select <ArrowRight className="w-4 h-4 ml-2" />
               </div>
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
             <div className="bg-white/80 backdrop-blur border border-border p-8 rounded-xl shadow-xl text-center">
                <button onClick={() => setSelectedRole(null)} className="absolute top-4 left-4 text-gray-400 hover:text-ink flex items-center gap-1 text-xs">
                   <CornerDownLeft className="w-3 h-3" /> Back
                </button>
                <div className="w-12 h-12 bg-ink text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-ink mb-6">Founder Actions</h3>
                
                <div className="space-y-4">
                  <button onClick={() => handleFounderAction('project')} className="w-full flex items-center gap-4 p-4 border border-border rounded-lg hover:border-ink hover:bg-paper transition-all group">
                     <div className="bg-orange-100 text-orange-700 p-2 rounded">
                        <Building2 className="w-5 h-5" />
                     </div>
                     <div className="text-left">
                        <div className="font-bold text-ink">Create Project</div>
                        <div className="text-xs text-ink-light">Draft your venture's manifesto</div>
                     </div>
                     <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-ink" />
                  </button>

                  <button onClick={() => handleFounderAction('profile')} className="w-full flex items-center gap-4 p-4 border border-border rounded-lg hover:border-ink hover:bg-paper transition-all group">
                     <div className="bg-blue-100 text-blue-700 p-2 rounded">
                        <FileText className="w-5 h-5" />
                     </div>
                     <div className="text-left">
                        <div className="font-bold text-ink">Create My Profile</div>
                        <div className="text-xs text-ink-light">Build your personal founder archive</div>
                     </div>
                     <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-ink" />
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Auth Result Feedback Card (Hint) */}
      {(authStatus === 'success' || authStatus === 'error') && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50"
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          <div className="bg-white/95 backdrop-blur border-t border-border shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-in-out">
            <div className="max-w-3xl mx-auto p-4 md:p-6">
                
                {/* Header Row */}
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${authStatus === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {authStatus === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                   </div>
                   <div className="flex-1 flex items-center justify-between">
                      <h4 className="font-bold text-ink text-lg">
                        {authStatus === 'success' ? '已获取您的 SecondMe 身份信息' : '未成功获取到您的 SecondMe 身份信息'}
                      </h4>
                      
                      {/* Collapsed Summary */}
                      {!isExpanded && authStatus === 'success' && user && (
                        <div className="flex items-center gap-3 animate-in fade-in duration-300">
                           <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                              <img src={user.avatar} className="w-full h-full object-cover" />
                           </div>
                           <span className="text-sm font-serif font-bold text-ink">{user.name}</span>
                           <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full">Synced</span>
                        </div>
                      )}
                   </div>
                </div>

                {/* Collapsible Details */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                   <div className="pl-14">
                      {authStatus === 'success' && user ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-paper rounded-lg p-4 border border-border/50">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border border-gray-300 shadow-sm flex-shrink-0">
                                 <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                 <div className="text-xs text-gray-500 uppercase font-bold">Name</div>
                                 <div className="text-ink font-serif font-bold">{user.name}</div>
                              </div>
                           </div>
                           
                           <div className="space-y-2">
                              <div>
                                 <span className="text-xs text-gray-500 uppercase font-bold mr-2">Email:</span>
                                 <span className="text-ink-light font-mono text-xs">{user.email}</span>
                              </div>
                              <div>
                                 <span className="text-xs text-gray-500 uppercase font-bold mr-2">Bio:</span>
                                 <span className="text-ink-light text-sm italic">"{user.bio}"</span>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <p className="text-ink-light">请重新尝试～</p>
                      )}
                      
                      {authStatus === 'success' && (
                         <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                             <CheckCircle2 className="w-3 h-3"/> Data synchronized. Select a role above to proceed.
                         </div>
                      )}
                   </div>
                </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Project Onboarding Page (Restored Full Version)
const PublishModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-border">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600"><Upload className="w-8 h-8" /></div>
          <h2 className="text-2xl font-serif font-bold text-ink mb-2">Ready to Publish?</h2>
          <p className="text-ink-light font-sans mb-8">Your project profile will be live for candidates to see. You can still make updates later.</p>
          <div className="flex gap-4 w-full">
            <button onClick={onClose} className="flex-1 py-3 px-4 rounded-lg border border-gray-300 font-sans font-medium text-ink hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-3 px-4 rounded-lg bg-ink text-white font-sans font-medium hover:bg-ink-light transition-colors shadow-lg">Confirm & Publish</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectOnboarding = ({ onBack, user }: { onBack: () => void, user: SecondMeUser | null }) => {
  // Initialize with user data if available
  const [data, setData] = useState<ProjectData>({
      ...initialProjectData,
      owner: user ? { name: user.name, avatar: user.avatar } : undefined
  });
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: `你好 ${user ? user.name : ''}！我是你的 AI 联合创始人助手。为了高效帮你生成项目档案，请告诉我你的项目名称、愿景和目前遇到的核心问题，或者直接上传 BP。` }]);
  const [chatSession, setChatSession] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selection, setSelection] = useState<{field:string, text:string, rect:DOMRect}|null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
       setChatSession(ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction: PROJECT_SYSTEM_INSTRUCTION, responseMimeType: "application/json" } }));
    };
    init();
  }, []);

  const handleMsg = async (text: string, att?: Attachment | null) => {
    if(!chatSession) return;
    const userMsg: Message = { role: 'user', text: att ? `[File: ${att.name}] ${text}` : text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const content = att ? [{ text }, { inlineData: { mimeType: att.mimeType, data: att.data } }] : text;
      const res = await chatSession.sendMessage({ message: content });
      const json = JSON.parse(res.text);
      setMessages(prev => [...prev, { role: 'model', text: json.reply }]);
      if(json.updates) setData(prev => ({ ...prev, ...json.updates }));
    } catch (e) { console.error(e); } finally {
      setLoading(false);
    }
  };

  const handleRevision = () => {
    if (annotations.length === 0) return alert("Please add annotations first.");
    const feedback = "Feedback based on annotations:\n" + annotations.map((a,i)=>`${i+1}. In ${a.field} (${a.selectedText}): ${a.comment}`).join("\n");
    handleMsg(feedback);
  };

  const confirmPublish = () => {
    setIsPublishModalOpen(false);
    setMessages(prev => [...prev, { role: 'model', text: "恭喜！项目已成功发布。正在为您匹配潜在候选人..." }]);
    setTimeout(onBack, 2000);
  };

  return (
    <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-300">
       <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 bg-[#F0EFE9] p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
             <div className="mb-4 flex-none flex justify-between items-center px-2">
                <h2 className="text-xs font-sans font-bold text-ink-light uppercase tracking-widest flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Live Preview</h2>
                <div className="text-[10px] bg-white px-2 py-1 rounded border border-border text-ink-light">{annotations.length} Annotations</div>
             </div>
             
             <ProjectArtifact 
                data={data} 
                annotations={annotations} 
                onAddAnnotation={(f,t,r)=>setSelection({field:f,text:t,rect:r})} 
             />
          </div>
          
          {/* Floating Action Buttons - Fixed at bottom center of the container */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-40">
             <button onClick={handleRevision} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 shadow-float rounded-full text-ink font-sans font-medium hover:bg-gray-50 hover:text-accent-blue transition-all">
               <Edit3 className="w-4 h-4" /> 修订 (Revise) {annotations.length > 0 && <span className="bg-accent-red text-white text-[10px] px-1.5 py-0.5 rounded-full">{annotations.length}</span>}
             </button>
             <button onClick={() => setIsPublishModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-ink shadow-float rounded-full text-white font-sans font-medium hover:bg-ink-light transition-all">
               <Check className="w-4 h-4" /> 发布 (Publish)
             </button>
          </div>

          {selection && <AnnotationBubble rect={selection.rect} onSave={(c)=>{setAnnotations([...annotations,{id:Date.now().toString(),field:selection.field,selectedText:selection.text,comment:c,timestamp:Date.now()}]);setSelection(null);window.getSelection()?.removeAllRanges()}} onCancel={()=>{setSelection(null);window.getSelection()?.removeAllRanges()}} />}
       </div>

       <div className="w-full md:w-[35%] border-l border-border bg-white z-20 shadow-2xl relative">
          <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-ink z-50"><X className="w-5 h-5"/></button>
          <AIChat messages={messages} onSendMessage={handleMsg} loading={loading} persona="Co-founder Agent" />
       </div>
       
       <PublishModal isOpen={isPublishModalOpen} onClose={()=>setIsPublishModalOpen(false)} onConfirm={confirmPublish} />
    </div>
  );
};

// 3. Profile Onboarding Page (Founder/Talent -> Profile)
const ProfileOnboarding = ({ onBack, user }: { onBack: () => void, user: SecondMeUser | null }) => {
  // Initialize with user data
  const [data, setData] = useState<ProfileData>({
      ...initialProfileData,
      name: user?.name || "",
      avatar: user?.avatar || "",
      bio: user?.bio || ""
  });
  const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: `你好 ${user ? user.name : ''}！我是你的职业经纪人。请告诉我你的职业背景、核心技能以及你正在寻找什么样的机会。如果有简历（PDF），请直接上传，我会帮你提取亮点。` }]);
  const [chatSession, setChatSession] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selection, setSelection] = useState<{field:string, text:string, rect:DOMRect}|null>(null);
  const [loading, setLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
       setChatSession(ai.chats.create({ model: 'gemini-3-flash-preview', config: { systemInstruction: PROFILE_SYSTEM_INSTRUCTION, responseMimeType: "application/json" } }));
    };
    init();
  }, []);

  const handleMsg = async (text: string, att?: Attachment | null) => {
    if(!chatSession) return;
    const userMsg: Message = { role: 'user', text: att ? `[Resume: ${att.name}] ${text}` : text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const content = att ? [{ text }, { inlineData: { mimeType: att.mimeType, data: att.data } }] : text;
      const res = await chatSession.sendMessage({ message: content });
      const json = JSON.parse(res.text);
      setMessages(prev => [...prev, { role: 'model', text: json.reply }]);
      if(json.updates) setData(prev => ({ ...prev, ...json.updates }));
    } catch (e) { console.error(e); } finally {
      setLoading(false);
    }
  };

  const handleRevision = () => {
    if (annotations.length === 0) return alert("Please add annotations first.");
    const feedback = "Feedback based on annotations:\n" + annotations.map((a,i)=>`${i+1}. In ${a.field} (${a.selectedText}): ${a.comment}`).join("\n");
    handleMsg(feedback);
  };

  const confirmPublish = () => {
    setIsPublishModalOpen(false);
    setMessages(prev => [...prev, { role: 'model', text: "恭喜！个人档案已成功发布。正在为您寻找合适的机会..." }]);
    setTimeout(onBack, 2000);
  };
  
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
       const file = e.target.files[0];
       const reader = new FileReader();
       reader.onload = (ev) => {
          setTempImage(ev.target?.result as string);
          setShowCropper(true);
       };
       reader.readAsDataURL(file);
    }
  };
  
  // Ensure skills is array for safe mapping
  const skills = Array.isArray(data.skills) ? data.skills : [];

  return (
    <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-300">
       <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 bg-[#F0EFE9] p-4 md:p-8 overflow-y-auto relative custom-scrollbar">
             <div className="mb-4 flex-none flex justify-between items-center px-2">
                <h2 className="text-xs font-sans font-bold text-ink-light uppercase tracking-widest flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Live Preview</h2>
                <div className="text-[10px] bg-white px-2 py-1 rounded border border-border text-ink-light">{annotations.length} Annotations</div>
             </div>

             <div className="max-w-3xl mx-auto bg-white/80 p-12 shadow-paper border border-border min-h-full relative">
                 <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                     <img src="https://www.svgrepo.com/show/491931/resume-cv.svg" className="w-32 h-32" alt="watermark" />
                 </div>
                 
                 {/* Profile Header */}
                 <div className="flex items-end gap-6 border-b-2 border-ink pb-8 mb-8">
                    <div className="relative group">
                       <div 
                         className="w-24 h-24 bg-gray-200 border border-gray-300 flex items-center justify-center text-4xl font-serif text-gray-400 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                         onClick={() => avatarInputRef.current?.click()}
                       >
                          {data.avatar ? (
                            <img src={data.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            data.name ? data.name[0] : "?"
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                             <Camera className="w-8 h-8" />
                          </div>
                       </div>
                       <input 
                          type="file" 
                          ref={avatarInputRef} 
                          onChange={handleAvatarSelect} 
                          className="hidden" 
                          accept="image/*" 
                       />
                    </div>
                    
                    <div className="flex-1">
                       <h1 className="text-4xl font-serif font-bold text-ink mb-1"><HighlightableText text={data.name || "Your Name"} field="name" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></h1>
                       <div className="text-lg font-sans text-accent-blue font-medium"><HighlightableText text={data.title || "Current Title"} field="title" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></div>
                       <div className="text-sm text-gray-500 mt-1"><HighlightableText text={data.location || "Location"} field="location" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></div>
                    </div>
                 </div>

                 {/* Bio & Superpower */}
                 <div className="space-y-8">
                    <section className="bg-paper p-6 rounded-lg border border-ink/5">
                       <h3 className="font-bold uppercase text-xs text-ink-light mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent-red"/> My Superpower</h3>
                       <p className="text-lg font-serif italic text-ink"><HighlightableText text={data.superpower} field="superpower" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></p>
                    </section>

                    <section>
                       <h3 className="font-bold uppercase text-xs text-ink-light mb-2">Professional Bio</h3>
                       <p className="leading-relaxed"><HighlightableText text={data.bio} field="bio" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section>
                           <h3 className="font-bold uppercase text-xs text-ink-light mb-3">Skills</h3>
                           <div className="flex flex-wrap gap-2">
                              {skills.length ? skills.map((s,i)=><span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded text-sm text-ink">{s}</span>) : <span className="text-gray-300 text-sm">Skills will appear here...</span>}
                           </div>
                        </section>
                        <section>
                           <h3 className="font-bold uppercase text-xs text-ink-light mb-3">Education</h3>
                           <p className="text-sm"><HighlightableText text={data.education} field="education" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></p>
                        </section>
                    </div>

                    <section>
                       <h3 className="font-bold uppercase text-xs text-ink-light mb-2">Experience Highlights</h3>
                       <div className="text-sm leading-relaxed whitespace-pre-wrap"><HighlightableText text={data.experienceHighlights} field="experienceHighlights" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></div>
                    </section>

                    <section className="border-t border-dashed border-gray-300 pt-6">
                       <h3 className="font-bold uppercase text-xs text-ink-light mb-2">Looking For</h3>
                       <p className="text-base text-accent-blue"><HighlightableText text={data.lookingFor} field="lookingFor" annotations={annotations} onSelection={(f,t,r)=>setSelection({field:f,text:t,rect:r})} /></p>
                    </section>
                 </div>
             </div>
          </div>
          
          {/* Floating Action Buttons */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-40">
             <button onClick={handleRevision} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 shadow-float rounded-full text-ink font-sans font-medium hover:bg-gray-50 hover:text-accent-blue transition-all">
               <Edit3 className="w-4 h-4" /> 修订 (Revise) {annotations.length > 0 && <span className="bg-accent-red text-white text-[10px] px-1.5 py-0.5 rounded-full">{annotations.length}</span>}
             </button>
             <button onClick={() => setIsPublishModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-ink shadow-float rounded-full text-white font-sans font-medium hover:bg-ink-light transition-all">
               <Check className="w-4 h-4" /> 发布 (Publish)
             </button>
          </div>
          
          {selection && <AnnotationBubble rect={selection.rect} onSave={(c)=>{setAnnotations([...annotations,{id:Date.now().toString(),field:selection.field,selectedText:selection.text,comment:c,timestamp:Date.now()}]);setSelection(null);window.getSelection()?.removeAllRanges()}} onCancel={()=>{setSelection(null);window.getSelection()?.removeAllRanges()}} />}
       </div>

       <div className="w-full md:w-[35%] border-l border-border bg-white z-20 shadow-2xl relative">
          <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-ink z-50"><X className="w-5 h-5"/></button>
          <AIChat messages={messages} onSendMessage={handleMsg} loading={loading} persona="Career Agent" />
       </div>
       
       <PublishModal isOpen={isPublishModalOpen} onClose={()=>setIsPublishModalOpen(false)} onConfirm={confirmPublish} />

       {showCropper && tempImage && (
          <AvatarCropper 
            imageSrc={tempImage} 
            onCancel={() => { setShowCropper(false); setTempImage(null); }}
            onSave={(croppedData) => {
               setData(prev => ({ ...prev, avatar: croppedData }));
               setShowCropper(false);
               setTempImage(null);
            }}
          />
       )}
    </div>
  );
};

// 4. New Projects Page (Showcase)
const ProjectsPage = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Simulate GET /api/projects
    setTimeout(() => {
      setProjects(mockProjects);
      setLoading(false);
    }, 800);
  }, []);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.oneLiner.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full bg-paper-texture p-6 md:p-10 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-ink/10 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-ink mb-2">Discover the Future</h1>
            <p className="text-ink-light font-sans">Explore high-potential ventures seeking co-founders.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search projects by name, sector..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-ink transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-ink-light"/></div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
             <Search className="w-12 h-12 mb-4 opacity-20" />
             <p>No projects found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <div key={project.id} className="group bg-white border border-border rounded-xl p-6 shadow-sm hover:shadow-float hover:-translate-y-1 transition-all relative flex flex-col h-full cursor-pointer">
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowUpRight className="w-5 h-5 text-ink" />
                </div>
                
                <div className="mb-4 flex gap-2">
                   <span className="px-2 py-1 bg-gray-100 text-xs font-bold font-sans text-ink uppercase tracking-wide rounded">{project.sector}</span>
                   <span className="px-2 py-1 border border-gray-200 text-xs font-sans text-gray-500 rounded">{project.stage}</span>
                </div>
                
                <h3 className="text-xl font-serif font-bold text-ink mb-2 truncate pr-6">{project.name}</h3>
                <p className="text-sm text-ink-light font-sans leading-relaxed line-clamp-3 mb-6 flex-1">{project.oneLiner}</p>
                
                <div className="mb-6">
                   <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Looking For</div>
                   <div className="flex flex-wrap gap-2">
                      {project.talentNeeds.slice(0, 3).map((role, i) => (
                        <span key={i} className="px-2 py-1 bg-accent-blue/5 text-accent-blue text-xs rounded font-medium">{role}</span>
                      ))}
                      {project.talentNeeds.length > 3 && <span className="px-2 py-1 bg-gray-50 text-gray-400 text-xs rounded">+ {project.talentNeeds.length - 3}</span>}
                   </div>
                </div>
                
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-auto">
                   <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">
                      {project.owner?.avatar ? <img src={project.owner.avatar} className="w-full h-full rounded-full object-cover"/> : project.owner?.name?.[0]}
                   </div>
                   <div className="text-xs">
                      <div className="font-bold text-ink">{project.owner?.name}</div>
                      <div className="text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3"/> {project.location}</div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 5. New Services Page (Ecosystem)
const ServicesPage = () => {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    // Simulate GET /api/services
    setTimeout(() => {
      setServices(mockServices);
      setLoading(false);
    }, 800);
  }, []);

  const categories = ["All", ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.services.some(srv => srv.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-full bg-paper-texture p-6 md:p-10 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-ink/10 pb-6">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-ink">Partner Ecosystem</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search services..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-ink transition-all"
              />
            </div>
            
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-ink appearance-none cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-ink-light"/></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map(service => (
              <div key={service.id} className="bg-white border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-8 h-8 rounded bg-paper flex items-center justify-center text-ink"><Building2 className="w-4 h-4" /></div>
                   <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{service.category}</span>
                </div>
                
                <h3 className="text-lg font-serif font-bold text-ink mb-2">{service.name}</h3>
                <p className="text-sm text-gray-600 mb-6 flex-1">{service.description}</p>
                
                <div className="mb-6">
                   <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Services</div>
                   <ul className="text-xs text-ink space-y-1">
                      {service.services.map((s, i) => <li key={i} className="flex items-center gap-2"><div className="w-1 h-1 bg-accent-blue rounded-full"></div>{s}</li>)}
                   </ul>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs">
                   <span className="text-gray-400">{service.city}</span>
                   <div className="flex gap-3">
                      <a href={`mailto:${service.contact}`} className="text-ink font-bold hover:text-accent-blue hover:underline">Contact</a>
                      <a href={`https://${service.website}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-ink"><ExternalLink className="w-3 h-3"/></a>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 6. New Inbox Page
const InboxPage = ({ onBack }: { onBack: () => void }) => {
  const [sessions, setSessions] = useState<InboxSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setSessions(mockSessions);
      setLoading(false);
    }, 600);
  }, []);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedSessionId) return;
    
    // Simulate POST /api/inbox
    const updatedSessions = sessions.map(s => {
      if (s.id === selectedSessionId) {
        return {
          ...s,
          updatedAt: Date.now(),
          messages: [...s.messages, { id: Date.now().toString(), sender: 'user' as const, content: newMessage, timestamp: Date.now() }]
        };
      }
      return s;
    }).sort((a, b) => b.updatedAt - a.updatedAt); // Re-sort by latest

    setSessions(updatedSessions);
    setNewMessage("");
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* Session List */}
      <div className={`w-full md:w-80 border-r border-border bg-gray-50 flex flex-col ${selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b border-border bg-white flex justify-between items-center">
            <h2 className="font-serif font-bold text-ink text-lg">Inbox</h2>
            <button onClick={onBack} className="md:hidden text-gray-500"><X className="w-5 h-5"/></button>
         </div>
         <div className="flex-1 overflow-y-auto">
            {loading ? (
               <div className="p-4 text-center text-gray-400 text-xs">Loading conversations...</div>
            ) : sessions.map(session => (
               <div 
                 key={session.id}
                 onClick={() => setSelectedSessionId(session.id)}
                 className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors ${selectedSessionId === session.id ? 'bg-white border-l-4 border-l-ink' : ''}`}
               >
                 <div className="flex justify-between items-baseline mb-1">
                    <span className="font-bold text-sm text-ink">{session.targetName}</span>
                    <span className="text-[10px] text-gray-400">{new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
                 <div className="text-xs text-gray-500 truncate">{session.messages[session.messages.length - 1]?.content || "No messages yet"}</div>
               </div>
            ))}
         </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
         {selectedSession ? (
            <>
               {/* Chat Header */}
               <div className="p-4 border-b border-border bg-white flex items-center gap-3 shadow-sm z-10">
                  <button onClick={() => setSelectedSessionId(null)} className="md:hidden text-gray-500"><CornerDownLeft className="w-5 h-5"/></button>
                  <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center font-bold text-sm">
                     {selectedSession.targetName[0]}
                  </div>
                  <div>
                     <div className="font-bold text-ink text-sm">{selectedSession.targetName}</div>
                     <div className="text-[10px] text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online</div>
                  </div>
               </div>
               
               {/* Messages */}
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                  {selectedSession.messages.map(msg => (
                     <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-4 py-2 rounded-xl text-sm ${
                           msg.sender === 'user' 
                             ? 'bg-ink text-white rounded-br-none' 
                             : 'bg-white border border-gray-200 text-ink rounded-bl-none shadow-sm'
                        }`}>
                           {msg.content}
                        </div>
                     </div>
                  ))}
               </div>

               {/* Input */}
               <div className="p-4 bg-white border-t border-border">
                  <div className="flex gap-2">
                     <input 
                       className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
                       placeholder="Type a message..."
                       value={newMessage}
                       onChange={(e) => setNewMessage(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                     />
                     <button onClick={handleSend} disabled={!newMessage.trim()} className="bg-ink text-white p-2 rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors">
                        <Send className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
               <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
               <p>Select a conversation to start chatting</p>
            </div>
         )}
      </div>
    </div>
  );
};

// 7. New Me (Dashboard) Page
const MePage = () => {
  const [myProjects, setMyProjects] = useState<ProjectData[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchType, setMatchType] = useState<'profile' | 'project' | null>(null);

  useEffect(() => {
    // Simulate fetching "My Projects"
    setTimeout(() => {
      setMyProjects(mockProjects.slice(0, 2)); // Assume user owns first 2 projects
    }, 500);
  }, []);

  const runMatch = (type: 'profile' | 'project', id?: string) => {
    setLoading(true);
    setMatchType(type);
    setMatches([]); // Clear previous

    // Simulate POST /api/match
    setTimeout(() => {
      if (type === 'profile') {
        setMatches([
           { id: '1', name: "Quantum Leap", titleOrSector: "DeepTech", score: 94, type: 'project', reasoning: "Your background in embedded systems aligns perfectly with their satellite edge computing needs.", pros: ["High Tech Fit", "Early Stage Equity"], cons: ["Relocation required"] },
           { id: '2', name: "EcoLogistics", titleOrSector: "CleanTech", score: 82, type: 'project', reasoning: "Good culture fit, but slightly different tech stack.", pros: ["Strong Team", "Impactful Mission"], cons: ["Lower Salary"] }
        ]);
      } else {
        setMatches([
           { id: 'u1', name: "David Kim", titleOrSector: "Senior Fullstack Dev", score: 91, type: 'talent', reasoning: "David has previously built similar EdTech platforms.", pros: ["Immediate Impact", "Leadership Exp"], cons: ["Expensive"] },
           { id: 'u2', name: "Elena R.", titleOrSector: "AI Researcher", score: 88, type: 'talent', reasoning: "Strong academic background in Generative AI.", pros: ["Deep Expertise"], cons: ["No startup exp"] }
        ]);
      }
      setLoading(false);
    }, 2000);
  };

  const handleSendMessage = (name: string, score: number) => {
    alert(`Message sent to inbox: "Hi ${name}, I am interested in connecting based on our AI match score of ${score}%!"`);
  };

  return (
    <div className="min-h-full bg-paper-texture p-6 md:p-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif font-bold text-ink mb-6">My Dashboard</h1>

        {/* AI Matchmaker Actions */}
        <section className="bg-white border border-border rounded-xl p-8 shadow-paper">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
                 <Zap className="w-5 h-5" />
              </div>
              <div>
                 <h2 className="text-xl font-bold font-serif text-ink">AI Matchmaker</h2>
                 <p className="text-sm text-gray-500">Analyze compatibility vectors to find your perfect partner.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => runMatch('profile')}
                disabled={loading}
                className="p-6 border border-gray-200 rounded-lg hover:border-ink/30 hover:bg-gray-50 transition-all text-left group"
              >
                 <div className="flex justify-between items-start mb-4">
                    <UserCircle className="w-8 h-8 text-gray-400 group-hover:text-ink transition-colors" />
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-ink group-hover:translate-x-1 transition-transform" />
                 </div>
                 <div className="font-bold text-ink mb-1">Find Projects for Me</div>
                 <div className="text-xs text-gray-500">Based on my profile skills & vision</div>
              </button>

              <div className="relative group">
                 <button className="w-full h-full p-6 border border-gray-200 rounded-lg hover:border-ink/30 hover:bg-gray-50 transition-all text-left">
                    <div className="flex justify-between items-start mb-4">
                        <Target className="w-8 h-8 text-gray-400 group-hover:text-accent-blue transition-colors" />
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-accent-blue group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="font-bold text-ink mb-1">Find Talent for Project</div>
                    <div className="text-xs text-gray-500">Select a project to start matching</div>
                 </button>
                 {/* Dropdown for projects */}
                 <div className="absolute top-full left-0 w-full mt-2 bg-white border border-border shadow-xl rounded-lg overflow-hidden hidden group-hover:block z-20 animate-in fade-in slide-in-from-top-2">
                    {myProjects.map(p => (
                       <div 
                         key={p.id} 
                         onClick={() => runMatch('project', p.id)}
                         className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 text-sm"
                       >
                          <span className="font-bold block text-ink">{p.name}</span>
                          <span className="text-xs text-gray-400">Looking for: {p.talentNeeds[0] || "Partners"}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </section>

        {/* Results Area */}
        {loading && (
           <div className="py-12 flex flex-col items-center justify-center text-center animate-pulse">
              <Sparkles className="w-8 h-8 text-indigo-500 mb-4 animate-spin" />
              <p className="font-serif text-lg text-ink">Analyzing compatibility vectors...</p>
              <p className="text-xs text-gray-400 mt-2">Comparing visions, skills, and market dynamics</p>
           </div>
        )}

        {!loading && matches.length > 0 && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200 pb-2">Top Matches Found</h3>
              {matches.map(match => (
                 <div key={match.id} className="bg-white border border-border rounded-lg p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                    {/* Score */}
                    <div className="flex-none flex flex-col items-center justify-center w-24 border-r border-gray-100 pr-6">
                       <div className="relative w-16 h-16 flex items-center justify-center">
                          <svg className="absolute w-full h-full transform -rotate-90">
                             <circle cx="32" cy="32" r="28" stroke="#f3f4f6" strokeWidth="4" fill="none" />
                             <circle cx="32" cy="32" r="28" stroke={match.score > 90 ? '#10b981' : '#f59e0b'} strokeWidth="4" fill="none" strokeDasharray="175" strokeDashoffset={175 - (175 * match.score) / 100} />
                          </svg>
                          <span className="font-bold text-lg text-ink">{match.score}%</span>
                       </div>
                       <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Match</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                       <div className="flex justify-between items-start mb-2">
                          <div>
                             <h4 className="text-xl font-serif font-bold text-ink">{match.name}</h4>
                             <div className="text-sm text-accent-blue font-medium">{match.titleOrSector}</div>
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${match.type === 'project' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{match.type}</span>
                       </div>
                       
                       <p className="text-sm text-gray-600 italic mb-4 border-l-2 border-gray-200 pl-3">"{match.reasoning}"</p>

                       <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                          <div>
                             <div className="font-bold text-green-700 mb-1 flex items-center gap-1"><ThumbsUp className="w-3 h-3"/> Pros</div>
                             <ul className="list-disc list-inside text-gray-500">{match.pros.map((p,i)=><li key={i}>{p}</li>)}</ul>
                          </div>
                          <div>
                             <div className="font-bold text-red-700 mb-1 flex items-center gap-1"><ThumbsDown className="w-3 h-3"/> Considerations</div>
                             <ul className="list-disc list-inside text-gray-500">{match.cons.map((c,i)=><li key={i}>{c}</li>)}</ul>
                          </div>
                       </div>

                       <button 
                         onClick={() => handleSendMessage(match.name, match.score)}
                         className="w-full py-2 bg-ink text-white rounded text-sm font-medium hover:bg-ink-light transition-colors"
                       >
                          Send Message
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Shell ---

const App = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'role_selection' | 'project_create' | 'profile_create' | 'projects' | 'services' | 'inbox' | 'me'>('landing');
  const [currentUser, setCurrentUser] = useState<SecondMeUser | null>(null);

  return (
    <div className="h-screen flex flex-col bg-paper-texture text-ink selection:bg-accent-red/20 overflow-hidden">
      <nav className="h-16 border-b border-border bg-paper/90 backdrop-blur z-50 flex-none flex items-center justify-between px-6 transition-all">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-8 h-8 bg-ink text-white flex items-center justify-center font-serif font-bold text-xl rounded-sm">H</div>
          <span className="font-serif font-bold text-lg tracking-wide">Startup Hub <span className="text-[10px] bg-ink/10 px-1 rounded ml-1 text-ink-light align-top">v0.5</span></span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-sans font-medium text-ink-light">
             <button onClick={()=>setCurrentView('projects')} className={`hover:text-ink transition-colors ${currentView === 'projects' ? 'text-ink font-bold' : ''}`}>Projects</button>
             <button onClick={()=>setCurrentView('services')} className={`hover:text-ink transition-colors ${currentView === 'services' ? 'text-ink font-bold' : ''}`}>Services</button>
             <button onClick={()=>setCurrentView('inbox')} className={`hover:text-ink transition-colors flex items-center gap-2 ${currentView === 'inbox' ? 'text-ink font-bold' : ''}`}><Mail className="w-4 h-4"/> Inbox</button>
             <button onClick={()=>setCurrentView('me')} className={`hover:text-ink transition-colors flex items-center gap-2 ${currentView === 'me' ? 'text-ink font-bold' : ''}`}><UserCircle className="w-4 h-4"/> Me</button>
             <button onClick={()=>alert('Settings coming soon in v0.6')} className="hover:text-ink transition-colors"><Settings className="w-4 h-4"/></button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative">
         {currentView === 'landing' && <LandingPage onStartCreate={() => setCurrentView('role_selection')} />}
         {currentView === 'role_selection' && (
           <RoleSelectionPage 
             onNavigate={setCurrentView} 
             onAuthSuccess={(user) => setCurrentUser(user)}
             user={currentUser}
           />
         )}
         {currentView === 'project_create' && <ProjectOnboarding onBack={() => setCurrentView('role_selection')} user={currentUser} />}
         {currentView === 'profile_create' && <ProfileOnboarding onBack={() => setCurrentView('role_selection')} user={currentUser} />}
         {currentView === 'projects' && <ProjectsPage />}
         {currentView === 'services' && <ServicesPage />}
         {currentView === 'inbox' && <InboxPage onBack={() => setCurrentView('landing')} />}
         {currentView === 'me' && <MePage />}
      </main>
    </div>
  );
};

const LandingPage = ({ onStartCreate }: { onStartCreate: () => void }) => {
  return (
    <div className="flex flex-col min-h-full overflow-y-auto custom-scrollbar bg-paper-texture relative">
       <GeometricDecorations />
       <section className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ink/10 bg-white/50 backdrop-blur-sm text-xs font-sans font-medium text-ink-light tracking-wide mb-4 shadow-sm">
               <Sparkles className="w-3 h-3 text-accent-red" />
               AI-Powered Co-founder Matching
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-ink leading-[1.1]">Connecting Visionaries <br/> <span className="italic font-light text-ink/80">with Builders</span></h1>
            <p className="text-lg md:text-xl font-sans text-ink-light max-w-2xl mx-auto leading-relaxed">Startup Hub is the premier network for high-potential founders in China. We use intelligent agents to articulate your vision and find the talent that fits your DNA.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
               <button onClick={onStartCreate} className="px-8 py-4 bg-ink text-white rounded-lg font-sans font-medium text-lg hover:bg-ink-light transition-all shadow-float flex items-center justify-center gap-2 group relative overflow-hidden">
                  <span className="relative z-10 flex items-center gap-2">Join the Network <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
               </button>
            </div>
          </div>
       </section>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);