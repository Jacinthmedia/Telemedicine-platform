import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { Copy, Check } from 'lucide-react';
import './MessageRenderer.css';

// --- 1. Code Block Component ---
const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mr-code-wrapper">
      <div className="mr-code-header">
        <span className="mr-code-lang">{language || 'text'}</span>
        <button onClick={handleCopy} className="mr-copy-btn">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter 
        language={language} 
        style={vscDarkPlus} 
        customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '13px' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

// --- 2. Chart Component ---
const ChartRenderer = ({ data, type, title }) => {
  const COLORS = ['#16A34A', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  return (
    <div className="mr-chart-wrapper">
      {title && <h4 className="mr-chart-title">{title}</h4>}
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <RechartsTooltip />
              <Bar dataKey="value" fill="#16A34A" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- 3. Main Message Renderer ---
const MessageRenderer = ({ content }) => {
  let parsedJson = null;

  // Detect if the message is a JSON chart payload
  try {
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      const parsed = JSON.parse(content);
      if (parsed.chart_type && parsed.data) {
        parsedJson = parsed;
      }
    }
  } catch (e) {
    // Not JSON, ignore
  }

  // If it's a chart, render the chart
  if (parsedJson) {
    return <ChartRenderer data={parsedJson.data} type={parsedJson.chart_type} title={parsedJson.title} />;
  }

  // Otherwise, render standard Markdown
  return (
    <div className="mr-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <CodeBlock 
                language={match[1]} 
                value={String(children).replace(/\n$/, '')} 
                {...props} 
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="mr-table-wrapper">
                <table>{children}</table>
              </div>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageRenderer;