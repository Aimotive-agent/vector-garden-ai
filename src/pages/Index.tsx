import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Database, Search, Zap, Upload, MessageSquare, Key } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/brand/veritas-mark.png" alt="" className="h-9 w-9 rounded-md object-cover" />
            <div>
              <div className="font-heading text-xl font-semibold text-foreground leading-tight">Veritas Vector Garden</div>
              <div className="text-[10px] tracking-widest text-accent uppercase">Knowledge Base + AI Chat</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              API Docs
            </Link>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/auth">Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-foreground">
            Your Documents, Growing Into Knowledge
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Store, search and chat over your documents with a private vector knowledge
            base — retrieval-augmented AI on infrastructure you control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/auth">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50 border-y border-border">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Powerful Features</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="gradient-card border border-border">
              <CardHeader>
                <Upload className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Easy File Upload</CardTitle>
                <CardDescription>
                  Drag and drop documents to automatically process and vectorize your content
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="gradient-card border border-border">
              <CardHeader>
                <Search className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Semantic Search</CardTitle>
                <CardDescription>
                  Find relevant content using natural language queries with AI-powered embeddings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="gradient-card border border-border">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI Chat Interface</CardTitle>
                <CardDescription>
                  Interactive chat with your documents using retrieval-augmented generation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="gradient-card border border-border">
              <CardHeader>
                <Key className="h-12 w-12 text-primary mb-4" />
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  Complete REST API with authentication for building custom applications
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="gradient-card border border-border">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-time Processing</CardTitle>
                <CardDescription>
                  Automatic document processing and chunking with live status updates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="gradient-card border border-border">
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
          <Button asChild size="lg" className="text-lg px-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/auth">
              Start Building
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 bg-muted/30">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 Veritas Global AI. Built with React, Supabase, and DeepSeek.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
