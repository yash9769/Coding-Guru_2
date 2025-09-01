import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { setupAuth, isAuthenticated } from "./replitAuth.ts";
import { insertProjectSchema, insertApiEndpointSchema } from "@shared/schema";
import { z } from "zod";
import { log } from "./vite.ts";

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug endpoint to check GEMINI_API_KEY - placed before auth middleware
  app.get('/api/debug/gemini-key', (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({ geminiKey: key ? key.substring(0, 5) + '...' : 'undefined' });
  });

  // AI generation routes - placed before auth middleware to avoid session issues
  app.post("/api/ai/generate-component", async (req: any, res) => {
    try {
      const { componentType, framework, stylePreferences } = req.body;
      
      if (!componentType || !framework || !stylePreferences) {
        return res.status(400).json({ 
          message: "Missing required fields: componentType, framework, stylePreferences" 
        });
      }

      const { generateReactComponent } = await import("./gemini");
      const generatedCode = await generateReactComponent(componentType, framework, stylePreferences);
      
      res.json({ 
        code: generatedCode,
        componentType,
        framework 
      });
    } catch (error) {
      console.error("Error generating component:", error);
      res.status(500).json({ 
        message: "Failed to generate component. Please check your API key and try again." 
      });
    }
  });

  app.post("/api/ai/generate-backend", async (req: any, res) => {
    try {
      const { database, framework, features } = req.body;
      
      if (!database || !framework || !features) {
        return res.status(400).json({ 
          message: "Missing required fields: database, framework, features" 
        });
      }

      const { generateBackendCode } = await import("./gemini");
      const generatedCode = await generateBackendCode(database, framework, features);
      
      res.json({ 
        ...generatedCode,
        database,
        framework 
      });
    } catch (error) {
      console.error("Error generating backend:", error);
      res.status(500).json({ 
        message: "Failed to generate backend code. Please check your API key and try again." 
      });
    }
  });

  // Build from prompt route - placed before auth middleware to avoid session issues
  app.post("/api/ai/build-from-prompt", async (req: any, res) => {
    console.log('🔍 DEBUG: /api/ai/build-from-prompt endpoint called');
    console.log('🔍 DEBUG: Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 DEBUG: Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      GEMINI_API_KEY_exists: !!process.env.GEMINI_API_KEY,
      GEMINI_API_KEY_length: process.env.GEMINI_API_KEY?.length || 0
    });

    try {
      const { prompt, mode } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        console.log('❌ DEBUG: Invalid prompt received:', { prompt, type: typeof prompt });
        return res.status(400).json({
          message: "A valid prompt is required"
        });
      }

      console.log('✅ DEBUG: Valid prompt received, importing gemini module...');
      const { buildFromPrompt } = await import("./gemini");
      console.log('✅ DEBUG: Gemini module imported, calling buildFromPrompt...');
      const generatedWebsite = await buildFromPrompt(prompt, mode || 'webapp');
      
      // Create a new project with the generated content
      const userId = "local_user_123"; // Use mock user ID for local development
      const projectData = insertProjectSchema.parse({
        title: generatedWebsite.title,
        description: generatedWebsite.description,
        userId,
        components: generatedWebsite.components,
        htmlCode: generatedWebsite.htmlCode,
        cssCode: generatedWebsite.cssCode,
        jsCode: generatedWebsite.jsCode,
      });
      
      const project = await storage.createProject(projectData);

      console.log('✅ DEBUG: Project created successfully, sending response...');
      console.log('✅ DEBUG: Response data summary:', {
        projectId: project.id,
        projectTitle: project.title,
        generatedTitle: generatedWebsite.title,
        htmlCodeLength: generatedWebsite.htmlCode.length,
        cssCodeLength: generatedWebsite.cssCode.length,
        jsCodeLength: generatedWebsite.jsCode.length
      });

      res.json({
        project,
        generated: generatedWebsite
      });
    } catch (error) {
      console.error("❌ DEBUG: Error building from prompt:", error);
      console.error("❌ DEBUG: Error details:", error instanceof Error ? error.message : "Unknown error");
      console.error("❌ DEBUG: Stack trace:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({
        message: "Failed to build from prompt. Please check your API key and try again."
      });
    }
  });

  // Auth middleware - setup authentication for routes that need it
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // For local dev, return mock user
      const user = {
        id: "local_user_123",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req: any, res) => {
    try {
      // For local dev, return mock projects
      const projects: any[] = [];
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user owns the project
      const userId = req.user.claims.sub;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId,
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user owns the project
      const userId = req.user.claims.sub;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updates = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(req.params.id, updates);
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if user owns the project
      const userId = req.user.claims.sub;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // API endpoint routes
  app.get("/api/projects/:projectId/endpoints", isAuthenticated, async (req: any, res) => {
    try {
      // Verify user owns the project
      const project = await storage.getProject(req.params.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.claims.sub;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const endpoints = await storage.getProjectEndpoints(req.params.projectId);
      res.json(endpoints);
    } catch (error) {
      console.error("Error fetching endpoints:", error);
      res.status(500).json({ message: "Failed to fetch endpoints" });
    }
  });

  app.post("/api/projects/:projectId/endpoints", isAuthenticated, async (req: any, res) => {
    try {
      // Verify user owns the project
      const project = await storage.getProject(req.params.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const userId = req.user.claims.sub;
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const endpointData = insertApiEndpointSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
      });
      
      const endpoint = await storage.createApiEndpoint(endpointData);
      res.status(201).json(endpoint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid endpoint data", errors: error.errors });
      }
      console.error("Error creating endpoint:", error);
      res.status(500).json({ message: "Failed to create endpoint" });
    }
  });

  // Vercel deployment route
  app.post("/api/deploy/vercel", async (req: any, res) => {
    console.log('🔍 DEPLOYMENT REQUEST RECEIVED');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    try {
      const {
        projectName,
        customDomain,
        environment,
        envVars,
        buildCommand = 'npm run build',
        outputDir = 'dist'
      } = req.body;

      console.log('📋 Extracted deployment parameters:');
      console.log('- Project Name:', projectName);
      console.log('- Custom Domain:', customDomain);
      console.log('- Environment:', environment);
      console.log('- Build Command:', buildCommand);
      console.log('- Output Dir:', outputDir);
      console.log('- Environment Variables Count:', envVars?.length || 0);

      if (!projectName) {
        console.log('❌ ERROR: Project name is required');
        return res.status(400).json({
          message: "Project name is required"
        });
      }

      console.log('✅ Starting Vercel deployment simulation for:', projectName);

      // For demo purposes, we'll simulate a Vercel deployment
      // In a real implementation, you would:
      // 1. Use Vercel API to create a deployment
      // 2. Upload built files to Vercel
      // 3. Get the actual deployment URL

      // Simulate deployment steps
      const deploymentSteps = [
        'Preparing deployment...',
        'Building application...',
        'Uploading assets...',
        'Configuring server...',
        'Starting application...'
      ];

      console.log('⏳ Simulating deployment steps...');
      for (const step of deploymentSteps) {
        console.log(`  ${step}`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Simulate deployment time
      console.log('⏱️  Simulating deployment time (3 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate a realistic Vercel deployment URL
      const deploymentId = Math.random().toString(36).substring(2, 15);
      const deploymentUrl = customDomain
        ? `https://${customDomain}`
        : `https://${projectName}-${deploymentId}.vercel.app`;

      console.log('🎉 Deployment simulation completed successfully!');
      console.log('Deployment URL:', deploymentUrl);
      console.log('Deployment ID:', deploymentId);

      const responseData = {
        success: true,
        deploymentUrl,
        deploymentId,
        projectName,
        environment,
        buildTime: '45s',
        status: 'ready'
      };

      console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));
      res.json(responseData);

    } catch (error) {
      console.error("❌ DEPLOYMENT ERROR:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({
        message: "Failed to deploy to Vercel",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Webapp preview route
  app.get("/api/preview/:projectId", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.claims.sub;

      // Get project from storage
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user owns the project
      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate HTML page with project content
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${project.cssCode || ''}
  </style>
</head>
<body>
${project.htmlCode || '<div class="p-8 text-center"><h1 class="text-2xl font-bold">Generated WebApp</h1><p>Your AI-generated web application preview.</p></div>'}
  <script>
${project.jsCode || ''}
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error("Error serving preview:", error);
      res.status(500).json({ message: "Failed to load preview" });
    }
  });

  const httpServer = createServer(app);
  const port = parseInt(process.env.PORT || '5000', 10);
  // Removed server listen here to avoid conflict with server/index.ts
  return httpServer;
}
