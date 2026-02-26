import React, { useState, useEffect, useCallback } from 'react';
import { geminiProxy } from '../lib/apiClient';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import { GeneratedText } from '../types';

interface HistoryItem {
    id: string;
    content: string;
    topic: string;
    platform: string;
    timestamp: Date;
}

export const TextEngine: React.FC = () => {
    const { saveText, loadHistory } = useGeneratedContent();
    const [activePlatform, setActivePlatform] = useState('Blog Post');
    const [topic, setTopic] = useState('');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Professional');
    const [language, setLanguage] = useState('Deutsch');
    const [isGenerating, setIsGenerating] = useState(false);
    const [content, setContent] = useState(`In the rapidly evolving landscape of the digital era, the concept of "ownership" has often felt ethereal. For decades, digital artists and creators have struggled with the paradox of infinite reproducibility. However, the emergence of Web3 technologies is fundamentally shifting this paradigm.`);
    const [history, setHistory] = useState<GeneratedText[]>([]);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [allPlatformContent, setAllPlatformContent] = useState<Record<string, string>>({});
    const [useTrends, setUseTrends] = useState(false);
    const [trendData, setTrendData] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Load text history from database
    const loadTextHistory = useCallback(async () => {
        const result = await loadHistory('text', 20);
        if (result.success && result.data) {
            setHistory(result.data as GeneratedText[]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only load once on mount

    useEffect(() => {
        loadTextHistory();
    }, [loadTextHistory]);

    const addToHistory = async (generatedText: string) => {
        // Save to database
        await saveText({
            content: generatedText,
            topic: topic || 'Untitled Generation',
            platform: activePlatform,
            audience: audience || null,
            tone: tone,
        });

        // Reload history
        loadTextHistory();
    };

    const generateContent = async (isContinuation = false) => {
        setIsGenerating(true);
        try {

            const today = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

            let prompt = "";
            if (isContinuation) {
                prompt = `Continue the following text, keeping the same style and context. The text is for a ${activePlatform} post about "${topic || 'Web3 and Digital Ownership'}". \n\nExisting text:\n${content}\n\nIMPORTANT: Only output the continuation text. Do not include any introductions, explanations, or meta-commentary. IMPORTANT: Write the entire output in ${language}.`;
            } else {
                const platformInstructions: Record<string, string> = {
                    'Blog Post': 'Write a comprehensive blog post with proper headings, paragraphs, and a conclusion. Include SEO-optimized content.',
                    'Facebook': 'Write an engaging Facebook post. Use emojis where appropriate and include a call-to-action. Keep it conversational and shareable.',
                    'Instagram': 'Write an Instagram caption. Use relevant hashtags (5-10) and emojis. Keep the tone visual and engaging.',
                    'LinkedIn': 'Write a professional LinkedIn post. Use a business tone, include insights, and end with a thought-provoking question or call-to-action.'
                };

                prompt = `${platformInstructions[activePlatform]}\n\nTopic: "${topic || 'The impact of Web3 on digital art'}"\nTarget Audience: ${audience || 'Creative Professionals'}\nTone: ${tone}\n\n${useTrends ? `IMPORTANT: Today is ${today}. Use Google Search to research the LATEST and most CURRENT information, news, and data about this topic from 2025 and 2026. Prioritize recent developments over older information. Mention specific recent events, statistics, or announcements from the past few months.\n\n` : ''}IMPORTANT: Output ONLY the ${activePlatform} content. Do not include any introductions like "Here is..." or explanations. Start directly with the content. IMPORTANT: Write the entire output in ${language}.`;
            }

            const systemInstruction = "You are an expert content creator specializing in tech and creative industries.";
            const tools = (useTrends && !isContinuation) ? [{ googleSearch: {} }] : undefined;

            // gemini-3-flash-preview supports { googleSearch: {} } tools and is confirmed working.
            // Experimental alternatives (gemini-1.5-pro, gemini-2.0-flash-exp) returned 404.
            const model = 'gemini-3-flash-preview';

            const response = await geminiProxy({
                action: 'generateContent',
                model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                systemInstruction,
                ...(tools ? { tools } : {})
            }) as any;

            if (response?.error) {
                throw new Error(JSON.stringify(response.error));
            }

            const generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (generatedText) {
                let finalContent = isContinuation ? content + "\n\n" + generatedText : generatedText;
                setContent(finalContent);
                if (!isContinuation) {
                    addToHistory(finalContent);
                    if (useTrends) {
                        setTrendData('✅ Content generated with latest Google Search data');
                    }
                }
            }
        } catch (error) {
            console.error("Generation error:", error);
            setContent(prev => prev + "\n\n[Error generating content. Please check your API key and try again.]");
        } finally {
            setIsGenerating(false);
        }
    };

    const generateAll = async () => {
        setIsGeneratingAll(true);
        const platforms = ['Blog Post', 'Facebook', 'Instagram', 'LinkedIn'];
        const results: Record<string, string> = {};

        try {

            for (const platform of platforms) {
                const platformInstructions: Record<string, string> = {
                    'Blog Post': 'Write a comprehensive blog post with proper headings, paragraphs, and a conclusion. Include SEO-optimized content.',
                    'Facebook': 'Write an engaging Facebook post. Use emojis where appropriate and include a call-to-action. Keep it conversational and shareable.',
                    'Instagram': 'Write an Instagram caption. Use relevant hashtags (5-10) and emojis. Keep the tone visual and engaging.',
                    'LinkedIn': 'Write a professional LinkedIn post. Use a business tone, include insights, and end with a thought-provoking question or call-to-action.'
                };

                const prompt = `${platformInstructions[platform]}\n\nTopic: "${topic || 'The impact of Web3 on digital art'}"\nTarget Audience: ${audience || 'Creative Professionals'}\nTone: ${tone}\n\n${useTrends ? 'IMPORTANT: Research the latest trends, news, and current information about this topic using Google Search. Incorporate recent developments and data into your content.\n\n' : ''}IMPORTANT: Output ONLY the ${platform} content. Do not include any introductions like "Here is..." or explanations. Start directly with the content. IMPORTANT: Write the entire output in ${language}.`;

                const config: any = {};
                const sysInstruction = "You are an expert content creator specializing in tech and creative industries.";

                // Enable Google Search grounding if trends are enabled
                if (useTrends) {
                    config.tools = [{
                        googleSearch: {}
                    }];
                }

                const response = await geminiProxy({
                    action: 'generateContent',
                    model: 'gemini-3-flash-preview',
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    systemInstruction: sysInstruction,
                    ...(Object.keys(config).length > 0 ? { config } : {})
                }) as any;

                if (response?.error) {
                    throw new Error(JSON.stringify(response.error));
                }

                const generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (generatedText) {
                    results[platform] = generatedText;
                    // Save each platform's content
                    await saveText({
                        content: generatedText,
                        topic: topic || 'Untitled Generation',
                        platform: platform,
                        audience: audience || null,
                        tone: tone,
                    });
                }
            }

            setAllPlatformContent(results);
            // Set the first platform's content as active
            setContent(results['Blog Post'] || '');

            if (useTrends) {
                setTrendData('✅ All content generated with latest Google Search data');
            }

            loadTextHistory();
        } catch (error) {
            console.error("Generation error:", error);
            alert("Error generating content for all platforms. Please try again.");
        } finally {
            setIsGeneratingAll(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#080c14] overflow-hidden">
            {/* Sidebar Controls */}
            <aside className="w-full md:w-80 bg-glass border-b md:border-b-0 md:border-r border-white/5 z-20 flex flex-col order-2 md:order-1 flex-shrink-0 h-full">
                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-6">

                    {/* Platform Selector */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Platform</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Blog Post', 'Facebook', 'Instagram', 'LinkedIn'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setActivePlatform(type);
                                        // If we have generated content for this platform, show it
                                        if (allPlatformContent[type]) {
                                            setContent(allPlatformContent[type]);
                                        }
                                    }}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${activePlatform === type ? 'bg-primary text-white shadow-lg' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'} ${allPlatformContent[type] ? 'ring-1 ring-green-500/30' : ''}`}
                                >
                                    {type}
                                    {allPlatformContent[type] && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Fields */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Core Topic</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full bg-[#0a0f18] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600"
                                placeholder="e.g. AI in Healthcare"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Audience</label>
                            <input
                                type="text"
                                value={audience}
                                onChange={(e) => setAudience(e.target.value)}
                                className="w-full bg-[#0a0f18] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none placeholder:text-slate-600"
                                placeholder="e.g. Doctors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tone</label>
                            <select
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-[#0a0f18] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:ring-1 focus:ring-primary outline-none appearance-none"
                            >
                                <option>Professional</option>
                                <option>Casual</option>
                                <option>Funny</option>
                                <option>Inspirational</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sprache / Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-[#0a0f18] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:ring-1 focus:ring-primary outline-none appearance-none"
                            >
                                <option value="Deutsch">🇩🇪 Deutsch</option>
                                <option value="English">🇬🇧 English</option>
                                <option value="Français">🇫🇷 Français</option>
                                <option value="Español">🇪🇸 Español</option>
                                <option value="Italiano">🇮🇹 Italiano</option>
                                <option value="Português">🇵🇹 Português</option>
                                <option value="Türkçe">🇹🇷 Türkçe</option>
                            </select>
                        </div>

                        {/* Trend Research Toggle */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                                <span>Use Latest Trends</span>
                                <span className="text-[8px] text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    Google Search
                                </span>
                            </label>
                            <button
                                onClick={() => setUseTrends(!useTrends)}
                                className={`w-full px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between transition-all ${useTrends
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-[#0a0f18] border border-white/10 text-slate-400 hover:bg-white/5'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-icons-round text-sm">trending_up</span>
                                    {useTrends ? 'Enabled' : 'Disabled'}
                                </span>
                            </button>
                            {useTrends && (
                                <p className="text-[9px] text-slate-500 mt-1">
                                    ✨ AI will use Google Search to find latest trends and news
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-2">
                        <button
                            onClick={() => generateContent(false)}
                            disabled={isGenerating || isGeneratingAll}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(19,91,236,0.3)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <span className="material-icons-round animate-spin text-sm">autorenew</span>
                            ) : (
                                <span className="material-icons-round text-sm">bolt</span>
                            )}
                            {isGenerating ? 'WRITING...' : 'GENERATE'}
                        </button>

                        <button
                            onClick={generateAll}
                            disabled={isGenerating || isGeneratingAll}
                            className="w-full bg-gradient-to-r from-purple-600 to-primary hover:from-purple-500 hover:to-primary-hover text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingAll ? (
                                <span className="material-icons-round animate-spin text-sm">autorenew</span>
                            ) : (
                                <span className="material-icons-round text-sm">auto_awesome</span>
                            )}
                            {isGeneratingAll ? 'GENERATING ALL...' : 'GENERATE ALL PLATFORMS'}
                        </button>
                    </div>

                    {/* History Section */}
                    {history.length > 0 && (
                        <div className="w-full pt-4 border-t border-white/10">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-sm">history</span> Recent Texts
                            </h3>
                            <div className="flex flex-col gap-2">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setContent(item.content);
                                            setTopic(item.topic || '');
                                            setActivePlatform(item.platform || 'Blog Post');
                                            setAudience(item.audience || '');
                                            setTone(item.tone || 'Professional');
                                        }}
                                        className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg p-3 group transition-all"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold">{item.platform || 'Text'}</span>
                                            <span className="text-[9px] text-slate-500">{new Date(item.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 font-medium truncate">{item.topic || 'Untitled'}</p>
                                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.content}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Editor */}
            <div className="flex-1 flex flex-col order-1 md:order-2 h-full min-w-0 bg-[#101622] p-4 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full h-full bg-[#0a0f18] rounded-2xl border border-white/10 p-6 md:p-10 shadow-2xl flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                            {topic || "Untitled Draft"}
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(content);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    } catch (err) {
                                        // Fallback for browsers that don't support clipboard API
                                        const textArea = document.createElement('textarea');
                                        textArea.value = content;
                                        textArea.style.position = 'fixed';
                                        textArea.style.left = '-999999px';
                                        document.body.appendChild(textArea);
                                        textArea.select();
                                        try {
                                            document.execCommand('copy');
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        } catch (e) {
                                            console.error('Copy failed:', e);
                                        }
                                        document.body.removeChild(textArea);
                                    }
                                }}
                                className={`p-2 rounded-lg transition-all ${copied
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                                    }`}
                                title={copied ? 'Copied!' : 'Copy'}
                            >
                                <span className="material-icons-round text-sm">{copied ? 'check' : 'content_copy'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        {content.split('\n').map((line, i) => {
                            // Check if line is a heading
                            if (line.startsWith('# ')) {
                                return <h1 key={i} className="text-3xl font-bold text-white mt-6 mb-4">{line.substring(2)}</h1>;
                            } else if (line.startsWith('## ')) {
                                return <h2 key={i} className="text-2xl font-bold text-white mt-5 mb-3">{line.substring(3)}</h2>;
                            } else if (line.startsWith('### ')) {
                                return <h3 key={i} className="text-xl font-bold text-slate-200 mt-4 mb-2">{line.substring(4)}</h3>;
                            }

                            // Format bold text **text**
                            const formattedLine = line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={j} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                                }
                                return part;
                            });

                            // Empty lines for spacing
                            if (line.trim() === '') {
                                return <div key={i} className="h-4"></div>;
                            }

                            return (
                                <p key={i} className="text-slate-300 leading-relaxed mb-3">
                                    {formattedLine}
                                </p>
                            );
                        })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="material-icons-round text-sm">text_fields</span>
                            {content.split(' ').length} words
                        </div>
                        <button
                            className={`flex items-center gap-2 text-primary font-bold text-sm cursor-pointer transition-opacity hover:underline ${isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
                            onClick={() => generateContent(true)}
                        >
                            <span className={`material-icons-round text-sm ${isGenerating ? 'animate-spin' : ''}`}>{isGenerating ? 'autorenew' : 'auto_awesome'}</span>
                            <span>Continue writing...</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};