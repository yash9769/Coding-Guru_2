import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/ui/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Copy,
  Code,
  Eye,
  Download,
  Share2,
} from "lucide-react";
import { useLocation } from "wouter";

export default function AIOutput() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('AI Generated Project');

  // Load data from sessionStorage or URL params
  useEffect(() => {
    console.log('🔍 DEBUG: ai-output.tsx - Page loaded, checking for data...');
    console.log('🔍 DEBUG: Current URL:', window.location.href);
    console.log('🔍 DEBUG: URL search params:', window.location.search);

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const title = urlParams.get('title');

    console.log('🔍 DEBUG: ai-output.tsx - URL parameters:', {
      hasUrlCode: !!code,
      hasUrlTitle: !!title,
      urlCodeLength: code?.length || 0,
      urlCodePreview: code ? code.substring(0, 100) + '...' : 'None',
      hasMarkdownInUrlCode: code?.includes('```') || false,
      hasESMInUrlCode: code?.includes('__defProp') || false,
      hasHTMLInUrlCode: code?.includes('<html') || false
    });

    if (code) {
      const decodedCode = decodeURIComponent(code);
      console.log('🔍 DEBUG: ai-output.tsx - Decoded code analysis:', {
        decodedLength: decodedCode.length,
        hasMarkdown: decodedCode.includes('```'),
        hasESM: decodedCode.includes('__defProp'),
        hasHTML: decodedCode.includes('<html'),
        hasScript: decodedCode.includes('<script'),
        startsWithHTML: decodedCode.trim().startsWith('<'),
        startsWithESM: decodedCode.trim().startsWith('var __defProp'),
        firstLine: decodedCode.split('\n')[0],
        first50Chars: decodedCode.substring(0, 50)
      });
      setGeneratedCode(decodedCode);
    }

    if (title) {
      setProjectTitle(decodeURIComponent(title));
    }

    // Also check sessionStorage as backup
    const storedCode = sessionStorage.getItem('ai-output-code');
    const storedTitle = sessionStorage.getItem('ai-output-title');

    console.log('🔍 DEBUG: ai-output.tsx - Session storage:', {
      hasStoredCode: !!storedCode,
      storedCodeLength: storedCode?.length || 0,
      hasMarkdownInStoredCode: storedCode?.includes('```') || false,
      hasESMInStoredCode: storedCode?.includes('__defProp') || false
    });

    if (storedCode && !code) {
      console.log('🔍 DEBUG: Using sessionStorage code');
      setGeneratedCode(storedCode);
    }

    if (storedTitle && !title) {
      setProjectTitle(storedTitle);
    }

    console.log('🔍 DEBUG: ai-output.tsx - Data loading complete');
  }, []);

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
      });
    }
  };

  const handleDownloadCode = () => {
    if (generatedCode) {
      const blob = new Blob([generatedCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectTitle.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Code file downloaded successfully",
      });
    }
  };

  // Create HTML preview from generated code
  const createPreviewHTML = (code: string) => {
    console.log('🔍 DEBUG: createPreviewHTML called with code:', {
      codeLength: code.length,
      codePreview: code.substring(0, 200) + (code.length > 200 ? '...' : ''),
      containsESM: code.includes('__defProp') || code.includes('__getOwnPropNames'),
      containsHTML: code.includes('<html') || code.includes('<body') || code.includes('<div'),
      containsScript: code.includes('<script') || code.includes('import'),
      startsWithHTML: code.trim().startsWith('<')
    });

    // Extract HTML content from the generated code
    const htmlMatch = code.match(/<html[^>]*>[\s\S]*<\/html>/i) ||
                      code.match(/<body[^>]*>[\s\S]*<\/body>/i) ||
                      code.match(/<div[^>]*>[\s\S]*<\/div>/i);

    if (htmlMatch) {
      console.log('🔍 DEBUG: Found HTML match:', {
        matchLength: htmlMatch[0].length,
        matchPreview: htmlMatch[0].substring(0, 100) + '...'
      });
      return htmlMatch[0];
    }

    console.log('🔍 DEBUG: No HTML match found, wrapping in basic HTML structure');

    // If no HTML found, wrap the code in a basic HTML structure
    const wrappedHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <title>${projectTitle}</title>
      </head>
      <body>
        <div class="p-4">
          <pre class="whitespace-pre-wrap font-mono text-sm">${code.replace(/</g, '<').replace(/>/g, '>')}</pre>
        </div>
      </body>
      </html>
    `;

    console.log('🔍 DEBUG: Wrapped HTML length:', wrappedHTML.length);
    return wrappedHTML;
  };

  if (!generatedCode) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-73px)]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">No Output Found</h2>
              <p className="text-muted-foreground mb-4">
                No AI-generated content was found. Please generate some content first.
              </p>
              <Button onClick={() => setLocation('/')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="flex h-[calc(100vh-73px)]">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-card border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => setLocation('/')} data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{projectTitle}</h1>
                <p className="text-sm text-muted-foreground">AI Generated Content</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                {generatedCode.length} characters
              </Badge>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-card border-b border-border px-4 flex space-x-1">
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'preview'
                  ? 'bg-background border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('preview')}
              data-testid="tab-preview"
            >
              <Eye className="w-4 h-4 mr-2 inline" />
              Preview
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'code'
                  ? 'bg-background border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('code')}
              data-testid="tab-code"
            >
              <Code className="w-4 h-4 mr-2 inline" />
              Code
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 bg-background overflow-auto">
            {activeTab === 'preview' ? (
              <div className="w-full h-full">
                <iframe
                  srcDoc={createPreviewHTML(generatedCode)}
                  className="w-full h-full border-0"
                  title="Generated Content Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="p-6">
                <div className="font-mono text-sm leading-relaxed">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">
                      Generated HTML Code
                    </span>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Code className="w-4 h-4" />
                      <span>HTML</span>
                    </div>
                  </div>

                  <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-100 p-4 rounded border overflow-x-auto">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="bg-card border-t border-border p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleCopyCode} data-testid="button-copy">
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Button variant="outline" onClick={handleDownloadCode} data-testid="button-download">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" data-testid="button-share">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={() => setLocation('/deploy')} data-testid="button-deploy">
                Deploy Project
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}