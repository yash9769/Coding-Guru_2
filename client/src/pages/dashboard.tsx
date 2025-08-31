import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/ui/navigation";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import { useLocation } from "wouter";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Search,
  Plus,
  Code,
  Undo,
  Redo,
  Star,
  Type,
  Image,
  MousePointer,
  FileText,
  CreditCard,
  Grid,
  Navigation as NavigationIcon,
  Trash2,
  WandSparkles,
  Video,
  Music,
  Calendar,
  MapPin,
  ShoppingCart,
  Users,
  Mail,
  Phone,
  Clock,
  Globe,
  Layers,
  Layout,
  Columns,
  BarChart3,
  PieChart,
  TrendingUp,
  MessageSquare,
  Heart,
  Share2,
  Download,
  Upload,
  Lock,
  User,
  Award,
  Bookmark,
  Tag,
  Play,
  Square,
  GitBranch,
  Settings,
  HelpCircle,
  Bell,
  Database,
  Save,
  Cpu,
  HardDrive,
  Zap,
  CheckCircle,
  Calculator,
  Filter,
} from "lucide-react";
import BuildFromPromptForm from "@/components/BuildFromPromptForm";

// Custom Node Component
const ComponentNode = ({ data, selected, id }: { data: any; selected: boolean; id: string }) => {
  // Map icon names to components
  const iconMap: Record<string, any> = {
    'NavigationIcon': NavigationIcon,
    'Star': Star,
    'Grid': Grid,
    'CreditCard': CreditCard,
    'FileText': FileText,
    'MousePointer': MousePointer,
    'Type': Type,
    'Image': Image,
    'Video': Video,
    'Music': Music,
    'Calendar': Calendar,
    'MapPin': MapPin,
    'ShoppingCart': ShoppingCart,
    'Users': Users,
    'Mail': Mail,
    'Phone': Phone,
    'Clock': Clock,
    'Globe': Globe,
    'Layers': Layers,
    'Layout': Layout,
    'Columns': Columns,
    'BarChart3': BarChart3,
    'PieChart': PieChart,
    'TrendingUp': TrendingUp,
    'MessageSquare': MessageSquare,
    'Heart': Heart,
    'Share2': Share2,
    'Download': Download,
    'Upload': Upload,
    'Lock': Lock,
    'User': User,
    'Award': Award,
    'Bookmark': Bookmark,
    'Tag': Tag,
    'Play': Play,
    'Square': Square,
    'GitBranch': GitBranch,
    'Settings': Settings,
    'HelpCircle': HelpCircle,
    'Bell': Bell,
    'Database': Database,
    'Save': Save,
    'Cpu': Cpu,
    'HardDrive': HardDrive,
    'Zap': Zap,
    'CheckCircle': CheckCircle,
    'Calculator': Calculator,
    'Filter': Filter,
  };

  const IconComponent = data.iconName ? iconMap[data.iconName] || Type : data.icon || Type;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className={`flex flex-col p-3 min-w-[200px] bg-white border-2 rounded-lg transition-all relative group ${
      selected ? 'border-accent shadow-lg' : 'border-gray-200'
    }`}>
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600 z-10"
        title="Delete component"
      >
        ×
      </button>

      {/* ReactFlow connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-accent border-2 border-white"
        style={{ top: -6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-accent border-2 border-white"
        style={{ bottom: -6 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-accent border-2 border-white"
        style={{ left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-accent border-2 border-white"
        style={{ right: -6 }}
      />

      <div className="flex items-center space-x-2 mb-2">
        <IconComponent className="w-4 h-4 text-accent" />
        <span className="font-medium text-sm">{data.componentName || data.name || 'Component'}</span>
      </div>
      {data.componentDescription && (
        <p className="text-xs text-muted-foreground mb-1">{data.componentDescription}</p>
      )}
      {data.componentContent && (
        <p className="text-xs text-muted-foreground mb-1">{data.componentContent}</p>
      )}
      {data.category && (
        <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-full inline-block">
          {data.category}
        </div>
      )}
      {data.aiMode && (
        <div className="mt-2">
          <Badge variant="secondary" className="text-xs">
            {data.aiMode === 'flow' ? 'Flow Component' : 'WebApp Component'}
          </Badge>
        </div>
      )}
    </div>
  );
};

// Node types for ReactFlow
const nodeTypes: NodeTypes = {
  component: ComponentNode,
};

interface ComponentPaletteItem {
  id: string;
  name: string;
  icon: any;
  category: string;
  description: string;
}

// Web App Components
const webAppComponents: ComponentPaletteItem[] = [
  // Layout
  { id: 'header', name: 'Header', icon: Layout, category: 'Layout', description: 'Page header section' },
  { id: 'navbar', name: 'Navigation', icon: NavigationIcon, category: 'Layout', description: 'Navigation menu' },
  { id: 'footer', name: 'Footer', icon: Grid, category: 'Layout', description: 'Page footer section' },
  { id: 'sidebar', name: 'Sidebar', icon: Layout, category: 'Layout', description: 'Side navigation panel' },
  { id: 'container', name: 'Container', icon: Layers, category: 'Layout', description: 'Content wrapper container' },
  { id: 'columns', name: 'Column Layout', icon: Columns, category: 'Layout', description: 'Multi-column layout' },

  // Content
  { id: 'hero', name: 'Hero Section', icon: Star, category: 'Content', description: 'Main hero banner' },
  { id: 'text', name: 'Text Block', icon: Type, category: 'Content', description: 'Rich text content' },
  { id: 'image', name: 'Image', icon: Image, category: 'Content', description: 'Image component' },
  { id: 'video', name: 'Video Player', icon: Video, category: 'Content', description: 'Video playback component' },
  { id: 'audio', name: 'Audio Player', icon: Music, category: 'Content', description: 'Audio playback component' },
  { id: 'gallery', name: 'Image Gallery', icon: Grid, category: 'Content', description: 'Photo gallery grid' },
  { id: 'testimonial', name: 'Testimonial', icon: MessageSquare, category: 'Content', description: 'Customer testimonial' },
  { id: 'faq', name: 'FAQ Section', icon: FileText, category: 'Content', description: 'Frequently asked questions' },

  // Interactive
  { id: 'button', name: 'Button', icon: MousePointer, category: 'Interactive', description: 'Clickable button' },
  { id: 'form', name: 'Contact Form', icon: FileText, category: 'Interactive', description: 'Input form' },
  { id: 'card', name: 'Card', icon: CreditCard, category: 'Interactive', description: 'Content card' },
  { id: 'modal', name: 'Modal Dialog', icon: Layers, category: 'Interactive', description: 'Popup modal window' },
  { id: 'tabs', name: 'Tab Container', icon: Columns, category: 'Interactive', description: 'Tabbed content switcher' },
  { id: 'accordion', name: 'Accordion', icon: Layers, category: 'Interactive', description: 'Collapsible content sections' },
  { id: 'search', name: 'Search Bar', icon: Search, category: 'Interactive', description: 'Search input component' },
  { id: 'rating', name: 'Star Rating', icon: Star, category: 'Interactive', description: 'Star rating component' },

  // E-commerce
  { id: 'product', name: 'Product Card', icon: ShoppingCart, category: 'E-commerce', description: 'Product display card' },
  { id: 'cart', name: 'Shopping Cart', icon: ShoppingCart, category: 'E-commerce', description: 'Shopping cart widget' },
  { id: 'pricing', name: 'Pricing Table', icon: CreditCard, category: 'E-commerce', description: 'Subscription pricing plans' },
  { id: 'checkout', name: 'Checkout Form', icon: CreditCard, category: 'E-commerce', description: 'Payment checkout form' },

  // Social
  { id: 'social', name: 'Social Media', icon: Share2, category: 'Social', description: 'Social media links' },
  { id: 'comments', name: 'Comments', icon: MessageSquare, category: 'Social', description: 'User comments section' },
  { id: 'like', name: 'Like Button', icon: Heart, category: 'Social', description: 'Like/favorite button' },
  { id: 'share', name: 'Share Button', icon: Share2, category: 'Social', description: 'Social sharing button' },

  // Data
  { id: 'chart', name: 'Bar Chart', icon: BarChart3, category: 'Data', description: 'Data visualization chart' },
  { id: 'pie', name: 'Pie Chart', icon: PieChart, category: 'Data', description: 'Circular data chart' },
  { id: 'stats', name: 'Statistics', icon: TrendingUp, category: 'Data', description: 'Key metrics display' },
  { id: 'progress', name: 'Progress Bar', icon: BarChart3, category: 'Data', description: 'Progress indicator' },

  // Utility
  { id: 'calendar', name: 'Calendar', icon: Calendar, category: 'Utility', description: 'Date picker calendar' },
  { id: 'map', name: 'Map', icon: MapPin, category: 'Utility', description: 'Interactive map' },
  { id: 'contact', name: 'Contact Info', icon: Phone, category: 'Utility', description: 'Contact information display' },
  { id: 'newsletter', name: 'Newsletter', icon: Mail, category: 'Utility', description: 'Email subscription form' },
  { id: 'team', name: 'Team Members', icon: Users, category: 'Utility', description: 'Team member showcase' },
  { id: 'countdown', name: 'Countdown Timer', icon: Clock, category: 'Utility', description: 'Event countdown timer' },
  { id: 'breadcrumb', name: 'Breadcrumbs', icon: NavigationIcon, category: 'Utility', description: 'Navigation breadcrumbs' },
];

// Flow Components
const flowComponents: ComponentPaletteItem[] = [
  // Flow Control
  { id: 'start', name: 'Start', icon: Play, category: 'Flow Control', description: 'Flow entry point' },
  { id: 'end', name: 'End', icon: Square, category: 'Flow Control', description: 'Flow exit point' },
  { id: 'decision', name: 'Decision', icon: GitBranch, category: 'Flow Control', description: 'Conditional branch' },
  { id: 'process', name: 'Process', icon: Settings, category: 'Flow Control', description: 'Processing step' },
  { id: 'subprocess', name: 'Subprocess', icon: Layers, category: 'Flow Control', description: 'Nested process' },

  // User Interaction
  { id: 'user-input', name: 'User Input', icon: User, category: 'User Interaction', description: 'User data input' },
  { id: 'user-decision', name: 'User Decision', icon: HelpCircle, category: 'User Interaction', description: 'User choice point' },
  { id: 'notification', name: 'Notification', icon: Bell, category: 'User Interaction', description: 'User notification' },

  // Data Operations
  { id: 'data-input', name: 'Data Input', icon: Database, category: 'Data Operations', description: 'Data source input' },
  { id: 'data-output', name: 'Data Output', icon: Save, category: 'Data Operations', description: 'Data destination output' },
  { id: 'data-process', name: 'Data Process', icon: Cpu, category: 'Data Operations', description: 'Data transformation' },
  { id: 'data-store', name: 'Data Store', icon: HardDrive, category: 'Data Operations', description: 'Data storage' },

  // Integration
  { id: 'api-call', name: 'API Call', icon: Globe, category: 'Integration', description: 'External API integration' },
  { id: 'webhook', name: 'Webhook', icon: Zap, category: 'Integration', description: 'Webhook trigger' },
  { id: 'email', name: 'Email', icon: Mail, category: 'Integration', description: 'Email sending' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, category: 'Integration', description: 'SMS sending' },

  // Business Logic
  { id: 'validation', name: 'Validation', icon: CheckCircle, category: 'Business Logic', description: 'Data validation' },
  { id: 'calculation', name: 'Calculation', icon: Calculator, category: 'Business Logic', description: 'Mathematical operation' },
  { id: 'timer', name: 'Timer', icon: Clock, category: 'Business Logic', description: 'Time-based trigger' },
  { id: 'condition', name: 'Condition', icon: Filter, category: 'Business Logic', description: 'Logical condition' },
];

// Dynamic component palette based on AI mode
const getComponentPalette = (mode: 'flow' | 'webapp' | null) => {
  return mode === 'flow' ? flowComponents : webAppComponents;
};

const getCategories = (mode: 'flow' | 'webapp' | null) => {
  if (mode === 'flow') {
    return ['Flow Control', 'User Interaction', 'Data Operations', 'Integration', 'Business Logic'];
  }
  return ['Layout', 'Content', 'Interactive', 'E-commerce', 'Social', 'Data', 'Utility'];
};

export default function Dashboard() {
  console.log('Dashboard component rendering...');
  const [, setLocation] = useLocation();

  // Add a simple test to verify the component is working
  useEffect(() => {
    console.log('Dashboard component mounted successfully!');
    console.log('Current view mode:', viewMode);
    console.log('Current AI mode:', aiMode);
    console.log('Number of nodes:', nodes.length);
  }, []);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'drag-drop' | 'ai-build'>('drag-drop');
  const [aiMode, setAiMode] = useState<'flow' | 'webapp' | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeModalTab, setCodeModalTab] = useState<'code' | 'preview'>('code');

  // Simple positioning function for desktop view
  const getRandomPosition = () => {
    const baseY = 50;
    return {
      x: (Math.random() - 0.5) * 800, // -400 to +400
      y: baseY + Math.random() * 400
    };
  };

  // Debug function to clear localStorage completely
  (window as any).clearAIBuilderStorage = () => {
    localStorage.removeItem('aibuilder-canvas-nodes');
    localStorage.removeItem('aibuilder-canvas-edges');
    console.log('AIBuilder localStorage cleared');
    window.location.reload();
  };

  // Load saved canvas state on component mount
  useEffect(() => {
    const savedNodes = localStorage.getItem('aibuilder-canvas-nodes');
    const savedEdges = localStorage.getItem('aibuilder-canvas-edges');
    
    if (savedNodes) {
      try {
        const parsedNodes = JSON.parse(savedNodes);
        
        // Validate and migrate nodes - remove any that contain React objects
        const validNodes = parsedNodes.map((node: any) => {
          // Check if node contains React component objects
          if (node.data && typeof node.data.icon === 'object' && node.data.icon.$$typeof) {
            console.warn('Removing node with React object icon:', node.id);
            return null;
          }
          
          // Ensure node has iconName, not icon object
          if (node.data && node.data.icon && !node.data.iconName) {
            console.warn('Converting old node format:', node.id);
            return null; // Remove to prevent React object errors
          }
          
          // Validate node structure
          if (!node.id || !node.data || !node.position) {
            console.warn('Invalid node structure:', node);
            return null;
          }
          
          return node;
        }).filter(Boolean); // Remove null nodes
        
        console.log(`Loaded ${validNodes.length} valid nodes from localStorage`);
        setNodes(validNodes);
      } catch (error) {
        console.error('Failed to load saved nodes:', error);
        // Clear corrupted localStorage completely
        localStorage.removeItem('aibuilder-canvas-nodes');
        localStorage.removeItem('aibuilder-canvas-edges');
        console.log('Cleared corrupted localStorage data');
      }
    }
    
    if (savedEdges) {
      try {
        const parsedEdges = JSON.parse(savedEdges);
        // Validate edges structure
        const validEdges = parsedEdges.filter((edge: any) => {
          return edge.id && edge.source && edge.target;
        });
        setEdges(validEdges);
      } catch (error) {
        console.error('Failed to load saved edges:', error);
        localStorage.removeItem('aibuilder-canvas-edges');
      }
    }
  }, [setNodes, setEdges]);

  // Save canvas state whenever nodes or edges change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      localStorage.setItem('aibuilder-canvas-nodes', JSON.stringify(nodes));
      localStorage.setItem('aibuilder-canvas-edges', JSON.stringify(edges));
    }
  }, [nodes, edges]);

  // Fetch user projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    retry: false,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { title: string; description?: string }) => {
      const response = await apiRequest('POST', '/api/projects', projectData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleCreateProject = () => {
    createProjectMutation.mutate({
      title: "New Website",
      description: "Created with AI Builder",
    });
  };

  const handleGenerateCode = async () => {
    console.log('Generate Code button clicked');
    console.log('Current nodes:', nodes.length);
    console.log('Nodes array:', nodes);
    setLastAction('generate-code');

    // More robust check for empty nodes
    if (!nodes || nodes.length === 0) {
      console.log('No components found, showing toast');
      toast({
        title: "No Components",
        description: "Add some components to generate code",
        variant: "destructive",
      });
      console.log('Exiting function early due to no components');
      return; // Exit the function early
    }

    console.log('Components found, proceeding with code generation');

    console.log('Setting isGeneratingCode to true');
    setIsGeneratingCode(true);

    try {
      // Generate code based on current components
      const componentTypes = nodes.map(node => {
        return node.data.componentName || node.data.name || 'Component';
      });

      console.log('Component types:', componentTypes);
      const prompt = `Generate a React component that includes: ${componentTypes.join(', ')}`;

      console.log('Making API request to /api/ai/generate-component');
      const response = await fetch('/api/ai/generate-component', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentType: 'Combined Layout',
          framework: 'React + Tailwind CSS',
          stylePreferences: `Include ${componentTypes.join(', ')} with modern responsive design`,
        }),
      });

      console.log('API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', errorText);
        throw new Error(`Failed to generate code: ${errorText}`);
      }

      const result = await response.json();
      console.log('API response result:', result);

      // Check if we have code in the response
      if (result.code) {
        console.log('Setting generated code and showing modal');
        console.log('Generated code preview:', result.code.substring(0, 200) + '...');
        setGeneratedCode(result.code);
        setShowCodeModal(true);

        toast({
          title: "Code Generated!",
          description: "Your component code has been generated successfully",
        });
        console.log('Code modal should be shown now');
      } else {
        console.error('No code in response:', result);
        toast({
          title: "Generation Issue",
          description: "Code was generated but not properly formatted",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Code generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate code. Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log('Setting isGeneratingCode to false');
      setIsGeneratingCode(false);
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, { nodes, edges }]);
      setNodes(lastState.nodes);
      setEdges(lastState.edges);
      setUndoStack(prev => prev.slice(0, -1));
      
      // Update localStorage
      localStorage.setItem('aibuilder-canvas-nodes', JSON.stringify(lastState.nodes));
      localStorage.setItem('aibuilder-canvas-edges', JSON.stringify(lastState.edges));
      
      toast({
        title: "Undone",
        description: "Last action has been undone",
      });
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, { nodes, edges }]);
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setRedoStack(prev => prev.slice(0, -1));
      
      // Update localStorage
      localStorage.setItem('aibuilder-canvas-nodes', JSON.stringify(nextState.nodes));
      localStorage.setItem('aibuilder-canvas-edges', JSON.stringify(nextState.edges));
      
      toast({
        title: "Redone",
        description: "Action has been redone",
      });
    }
  };

  const handleClearCanvas = () => {
    // Save current state for undo
    setUndoStack(prev => [...prev, { nodes, edges }]);
    setRedoStack([]);

    // Clear the canvas
    setNodes([]);
    setEdges([]);
    setSelectedComponent(null);

    // Clear localStorage
    localStorage.removeItem('aibuilder-canvas-nodes');
    localStorage.removeItem('aibuilder-canvas-edges');

    toast({
      title: "Canvas Cleared",
      description: "All components have been removed from the canvas",
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    // Save current state for undo
    setUndoStack(prev => [...prev, { nodes, edges }]);
    setRedoStack([]);

    // Remove the node and any connected edges
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));

    // Clear selection if the deleted node was selected
    if (selectedComponent === nodeId) {
      setSelectedComponent(null);
    }

    toast({
      title: "Component Deleted",
      description: "Component has been removed from the canvas",
    });
  };

  const handleComponentDrop = (component: ComponentPaletteItem) => {
    console.log('Component drop initiated:', component.name);

    // Save current state for undo
    setUndoStack(prev => [...prev, { nodes, edges }]);
    setRedoStack([]); // Clear redo stack when new action is performed

    // Get icon name for safe serialization
    const getIconName = (IconComponent: any) => {
      const iconName = IconComponent.displayName || IconComponent.name;
      if (iconName) return iconName;

      // Map specific icons to names
      if (IconComponent === NavigationIcon) return 'NavigationIcon';
      if (IconComponent === Grid) return 'Grid';
      if (IconComponent === Star) return 'Star';
      if (IconComponent === Type) return 'Type';
      if (IconComponent === Image) return 'Image';
      if (IconComponent === MousePointer) return 'MousePointer';
      if (IconComponent === FileText) return 'FileText';
      if (IconComponent === CreditCard) return 'CreditCard';
      if (IconComponent === Video) return 'Video';
      if (IconComponent === Music) return 'Music';
      if (IconComponent === Calendar) return 'Calendar';
      if (IconComponent === MapPin) return 'MapPin';
      if (IconComponent === ShoppingCart) return 'ShoppingCart';
      if (IconComponent === Users) return 'Users';
      if (IconComponent === Mail) return 'Mail';
      if (IconComponent === Phone) return 'Phone';
      if (IconComponent === Clock) return 'Clock';
      if (IconComponent === Globe) return 'Globe';
      if (IconComponent === Layers) return 'Layers';
      if (IconComponent === Layout) return 'Layout';
      if (IconComponent === Columns) return 'Columns';
      if (IconComponent === BarChart3) return 'BarChart3';
      if (IconComponent === PieChart) return 'PieChart';
      if (IconComponent === TrendingUp) return 'TrendingUp';
      if (IconComponent === MessageSquare) return 'MessageSquare';
      if (IconComponent === Heart) return 'Heart';
      if (IconComponent === Share2) return 'Share2';
      if (IconComponent === Download) return 'Download';
      if (IconComponent === Upload) return 'Upload';
      if (IconComponent === Lock) return 'Lock';
      if (IconComponent === User) return 'User';
      if (IconComponent === Award) return 'Award';
      if (IconComponent === Bookmark) return 'Bookmark';
      if (IconComponent === Tag) return 'Tag';
      if (IconComponent === Search) return 'Search';
      if (IconComponent === Play) return 'Play';
      if (IconComponent === Square) return 'Square';
      if (IconComponent === GitBranch) return 'GitBranch';
      if (IconComponent === Settings) return 'Settings';
      if (IconComponent === HelpCircle) return 'HelpCircle';
      if (IconComponent === Bell) return 'Bell';
      if (IconComponent === Database) return 'Database';
      if (IconComponent === Save) return 'Save';
      if (IconComponent === Cpu) return 'Cpu';
      if (IconComponent === HardDrive) return 'HardDrive';
      if (IconComponent === Zap) return 'Zap';
      if (IconComponent === CheckCircle) return 'CheckCircle';
      if (IconComponent === Calculator) return 'Calculator';
      if (IconComponent === Filter) return 'Filter';
      return 'Type'; // fallback
    };

    // Get random position
    const position = getRandomPosition();

    console.log('Component drop:', component.name);
    console.log(`   Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);

    const newNode: Node = {
      id: `${component.id}-${Date.now()}`,
      type: 'component',
      position: position,
      data: {
        iconName: getIconName(component.icon),
        componentType: component.id,
        componentName: component.name,
        componentDescription: component.description,
        category: component.category,
        onDelete: handleDeleteNode,
        properties: {
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          width: 'auto',
        }
      },
    };

    console.log('Adding new node:', newNode.id, 'at position:', position);
    setNodes((nds) => nds.concat(newNode));
    setSelectedComponent(newNode.id);

    // Trigger fitView after adding the component to ensure it's visible
    setTimeout(() => {
      if (reactFlowInstance) {
        console.log('Fitting view after component drop');
        reactFlowInstance.fitView({ padding: 0.2 });
      } else {
        console.log('No ReactFlow instance available for fitView');
      }
    }, 50);
  };

  const componentPalette = getComponentPalette(aiMode);
  const categories = getCategories(aiMode);

  const filteredComponents = componentPalette.filter((component: ComponentPaletteItem) =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Code Modal */}
      {(() => {
        console.log('Modal render check - showCodeModal:', showCodeModal, 'generatedCode exists:', !!generatedCode);
        console.log('Generated code preview:', generatedCode?.substring(0, 200) + '...');

        // Create HTML preview from generated code
        const createPreviewHTML = (code: string) => {
          // Extract HTML content from the generated code
          const htmlMatch = code.match(/<html[^>]*>[\s\S]*<\/html>/i) ||
                           code.match(/<body[^>]*>[\s\S]*<\/body>/i) ||
                           code.match(/<div[^>]*>[\s\S]*<\/div>/i);

          if (htmlMatch) {
            return htmlMatch[0];
          }

          // If no HTML found, wrap the code in a basic HTML structure
          return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <script src="https://cdn.tailwindcss.com"></script>
              <title>Preview</title>
            </head>
            <body>
              <div class="p-4">
                ${code}
              </div>
            </body>
            </html>
          `;
        };

        return showCodeModal && generatedCode ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden relative">
              <button
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-xl z-10"
                onClick={() => {
                  console.log('Modal close button clicked');
                  setShowCodeModal(false);
                  setCodeModalTab('code');
                }}
                aria-label="Close code modal"
              >
                ✕
              </button>

              <div className="p-6 pb-0">
                <h2 className="text-xl font-semibold mb-4">🎉 Generated Content!</h2>
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ <strong>Success!</strong> Your AI-generated content is ready!
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Code length: {generatedCode.length} characters
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    className={`px-4 py-2 font-medium text-sm ${
                      codeModalTab === 'code'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setCodeModalTab('code')}
                  >
                    📝 Code
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${
                      codeModalTab === 'preview'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setCodeModalTab('preview')}
                  >
                    👁️ Preview
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="px-6 pb-6">
                {codeModalTab === 'code' ? (
                  <>
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-100 p-4 rounded overflow-x-auto border max-h-96 overflow-y-auto">
                      {generatedCode}
                    </pre>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCode);
                          alert('Code copied to clipboard!');
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        📋 Copy Code
                      </button>
                      <button
                        onClick={() => setShowCodeModal(false)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <iframe
                        srcDoc={createPreviewHTML(generatedCode)}
                        className="w-full h-96 border-0"
                        title="Generated Content Preview"
                        sandbox="allow-scripts"
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setCodeModalTab('code')}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                      >
                        View Code
                      </button>
                      <button
                        onClick={() => setShowCodeModal(false)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null;
      })()}

      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="flex h-[calc(100vh-73px)]">

          {viewMode === 'drag-drop' ? (
            <>
              {/* Component Palette */}
              <div className="w-80 bg-card border-r border-border p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Components</h3>
                    {aiMode && (
                      <div className="flex items-center mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {aiMode === 'flow' ? 'Flow Mode' : 'Web App Mode'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAiMode(null);
                            console.log('AI mode reset to default');
                          }}
                          className="ml-2 h-6 px-2 text-xs"
                        >
                          Reset
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setLastAction('build-with-ai');
                      setViewMode('ai-build');
                    }}
                    className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                    data-testid="button-build-with-ai"
                  >
                    <WandSparkles className="w-4 h-4 mr-1" />
                    Build with AI
                  </Button>
                </div>
            
            {/* Search */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-search-components"
              />
            </div>

            {/* Component Categories */}
            <div className="space-y-4">
              {categories.map((category) => {
                const categoryComponents = filteredComponents.filter(c => c.category === category);
                if (categoryComponents.length === 0) return null;

                return (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {categoryComponents.map((component) => (
                        <div
                          key={component.id}
                          className="bg-background border border-border rounded-lg p-3 cursor-move hover:shadow-md hover:-translate-y-0.5 transition-all"
                          onClick={() => handleComponentDrop(component)}
                          data-testid={`component-${component.id}`}
                        >
                          <div className="flex items-center">
                            {(() => {
                              // Map icon components to their names and render safely
                              const iconMap: Record<string, any> = {
                                'NavigationIcon': NavigationIcon,
                                'Grid': Grid,
                                'Star': Star,
                                'Type': Type,
                                'Image': Image,
                                'MousePointer': MousePointer,
                                'FileText': FileText,
                                'CreditCard': CreditCard,
                                'Video': Video,
                                'Music': Music,
                                'Calendar': Calendar,
                                'MapPin': MapPin,
                                'ShoppingCart': ShoppingCart,
                                'Users': Users,
                                'Mail': Mail,
                                'Phone': Phone,
                                'Clock': Clock,
                                'Globe': Globe,
                                'Layers': Layers,
                                'Layout': Layout,
                                'Columns': Columns,
                                'BarChart3': BarChart3,
                                'PieChart': PieChart,
                                'TrendingUp': TrendingUp,
                                'MessageSquare': MessageSquare,
                                'Heart': Heart,
                                'Share2': Share2,
                                'Download': Download,
                                'Upload': Upload,
                                'Lock': Lock,
                                'User': User,
                                'Award': Award,
                                'Bookmark': Bookmark,
                                'Tag': Tag,
                                'Search': Search,
                              };
                              
                              // Get icon name from component
                              let iconName = 'Type'; // fallback
                              if (component.icon === NavigationIcon) iconName = 'NavigationIcon';
                              else if (component.icon === Grid) iconName = 'Grid';
                              else if (component.icon === Star) iconName = 'Star';
                              else if (component.icon === Type) iconName = 'Type';
                              else if (component.icon === Image) iconName = 'Image';
                              else if (component.icon === MousePointer) iconName = 'MousePointer';
                              else if (component.icon === FileText) iconName = 'FileText';
                              else if (component.icon === CreditCard) iconName = 'CreditCard';
                              else if (component.icon === Video) iconName = 'Video';
                              else if (component.icon === Music) iconName = 'Music';
                              else if (component.icon === Calendar) iconName = 'Calendar';
                              else if (component.icon === MapPin) iconName = 'MapPin';
                              else if (component.icon === ShoppingCart) iconName = 'ShoppingCart';
                              else if (component.icon === Users) iconName = 'Users';
                              else if (component.icon === Mail) iconName = 'Mail';
                              else if (component.icon === Phone) iconName = 'Phone';
                              else if (component.icon === Clock) iconName = 'Clock';
                              else if (component.icon === Globe) iconName = 'Globe';
                              else if (component.icon === Layers) iconName = 'Layers';
                              else if (component.icon === Layout) iconName = 'Layout';
                              else if (component.icon === Columns) iconName = 'Columns';
                              else if (component.icon === BarChart3) iconName = 'BarChart3';
                              else if (component.icon === PieChart) iconName = 'PieChart';
                              else if (component.icon === TrendingUp) iconName = 'TrendingUp';
                              else if (component.icon === MessageSquare) iconName = 'MessageSquare';
                              else if (component.icon === Heart) iconName = 'Heart';
                              else if (component.icon === Share2) iconName = 'Share2';
                              else if (component.icon === Download) iconName = 'Download';
                              else if (component.icon === Upload) iconName = 'Upload';
                              else if (component.icon === Lock) iconName = 'Lock';
                              else if (component.icon === User) iconName = 'User';
                              else if (component.icon === Award) iconName = 'Award';
                              else if (component.icon === Bookmark) iconName = 'Bookmark';
                              else if (component.icon === Tag) iconName = 'Tag';
                              else if (component.icon === Search) iconName = 'Search';
                              
                              const IconComponent = iconMap[iconName] || Type;
                              return <IconComponent className="w-4 h-4 text-muted-foreground mr-2" />;
                            })()}
                            <div>
                              <span className="text-sm font-medium">{component.name}</span>
                              <p className="text-xs text-muted-foreground">{component.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Canvas Toolbar */}
            <div className="bg-card border-b border-border p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-sm text-muted-foreground">
                  {reactFlowInstance ? 'ReactFlow: ✅' : 'ReactFlow: ❌'}
                  {nodes.length > 0 ? ` | Components: ${nodes.length}` : ' | Components: 0'}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  data-testid="button-undo"
                >
                  <Undo className="w-4 h-4 mr-1" />
                  Undo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  data-testid="button-redo"
                >
                  <Redo className="w-4 h-4 mr-1" />
                  Redo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCanvas}
                  disabled={nodes.length === 0}
                  data-testid="button-clear-canvas"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button
                  onClick={() => {
                    console.log('Generate Code button clicked directly');
                    console.log('Current nodes state:', nodes);
                    console.log('Nodes length:', nodes?.length || 0);
                    handleGenerateCode();
                  }}
                  disabled={(!nodes || nodes.length === 0) || isGeneratingCode}
                  className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                  data-testid="button-generate-code"
                >
                  <Code className="w-4 h-4 mr-1" />
                  {isGeneratingCode ? 'Generating...' : 'Generate Code'}
                </Button>
                <Button
                  onClick={() => {
                    console.log('Manual fitView button clicked');
                    if (reactFlowInstance) {
                      console.log('Calling manual fitView');
                      reactFlowInstance.fitView({ padding: 0.1 });
                    } else {
                      console.log('No ReactFlow instance for manual fitView');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="ml-2"
                >
                  Fit View
                </Button>
                <Button
                  onClick={() => {
                    console.log('Refresh viewport button clicked');
                    if (reactFlowInstance && nodes.length > 0) {
                      // Simple refresh with fitView
                      setTimeout(() => {
                        reactFlowInstance.fitView({ padding: 0.1 });
                      }, 50);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="ml-1"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* ReactFlow Canvas */}
            <div className="flex-1 relative bg-muted/50 overflow-hidden">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={(instance) => {
                  console.log('ReactFlow instance initialized:', !!instance);
                  setReactFlowInstance(instance);
                }}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.1}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                className="bg-background"
              >
                <Controls position="top-right" />
                <MiniMap
                  position="bottom-right"
                  nodeColor="#3b82f6"
                  zoomable
                  pannable
                />
                <Background gap={20} size={1} color="#e5e7eb" />
              </ReactFlow>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">Build with AI</h2>
              <Button
                variant="ghost"
                onClick={() => setViewMode('drag-drop')}
                data-testid="button-back-to-canvas"
              >
                ← Back to Canvas
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-8 mb-8">
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  aiMode === 'flow' ? 'border-accent ring-2 ring-accent/20' : ''
                }`}
                onClick={() => {
                  console.log('Flow Builder card clicked');
                  setAiMode('flow');
                  setViewMode('drag-drop'); // Stay on drag-drop view
                  console.log('AI mode set to flow, staying on drag-drop view');
                  alert('Flow Builder selected! You can now drag and drop flow components on the canvas.');
                }}
                data-testid="card-ai-flow"
              >
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <NavigationIcon className="w-5 h-5 mr-2 text-accent" />
                    Flow Builder
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Create interactive workflows and process diagrams with AI assistance. Perfect for user journeys, business processes, and complex interactions.
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  aiMode === 'webapp' ? 'border-accent ring-2 ring-accent/20' : ''
                }`}
                onClick={() => {
                  console.log('Web App Builder card clicked');
                  setAiMode('webapp');
                  setViewMode('drag-drop'); // Stay on drag-drop view
                  console.log('AI mode set to webapp, staying on drag-drop view');
                  alert('Web App Builder selected! You can now drag and drop web components on the canvas.');
                }}
                data-testid="card-ai-webapp"
              >
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="w-5 h-5 mr-2 text-accent" />
                    Web App Builder
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Generate complete web applications from natural language descriptions. Get full HTML, CSS, and JavaScript code ready to deploy.
                  </p>
                </CardContent>
              </Card>
            </div>

            {aiMode && (
              <div className="space-y-4">
                <BuildFromPromptForm
                  mode={aiMode}
                  onSuccess={(result) => {
                    console.log('Dashboard: BuildFromPromptForm onSuccess called with:', result);
                    console.log('Dashboard: Generated object:', result.generated);
                    console.log('Dashboard: Navigating to AI output page');

                    // Store the result in sessionStorage for the AI output page
                    const code = result.generated?.htmlCode || result.htmlCode || 'No code generated';
                    const title = result.project?.title || result.generated?.title || 'AI Generated Project';

                    sessionStorage.setItem('ai-output-code', code);
                    sessionStorage.setItem('ai-output-title', title);

                    // Navigate to the AI output page
                    setLocation('/ai-output');
                    setAiMode(null);
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() => setAiMode(null)}
                  className="w-full"
                  data-testid="button-cancel-ai-build"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
</>
);
}
