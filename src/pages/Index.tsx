import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Database, Search, Zap, Upload, MessageSquare, Key } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">AI Vector Base</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              API Docs
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AI-Powered Vector Database
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Store, search, and retrieve documents with advanced AI embeddings. 
            Build intelligent applications with semantic search capabilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/dashboard">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8" asChild>
              <Link to="/docs">View API Docs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Powerful Features</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Upload className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Easy File Upload</CardTitle>
                <CardDescription>
                  Drag and drop documents to automatically process and vectorize your content
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Search className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Semantic Search</CardTitle>
                <CardDescription>
                  Find relevant content using natural language queries with AI-powered embeddings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI Chat Interface</CardTitle>
                <CardDescription>
                  Interactive chat with your documents using retrieval-augmented generation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Key className="h-12 w-12 text-primary mb-4" />
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  Complete REST API with authentication for building custom applications
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-time Processing</CardTitle>
                <CardDescription>
                  Automatic document processing and chunking with live status updates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Database className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Vector Storage</CardTitle>
                <CardDescription>
                  High-performance vector database with PostgreSQL and pgvector extension
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6">Ready to Get Started?</h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your first vector base and start building AI-powered applications today.
          </p>
          <Button asChild size="lg" className="text-lg px-8">
            <Link to="/dashboard">
              Start Building
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 bg-muted/30">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 AI Vector Base. Built with React, Supabase, and DeepSeek.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;