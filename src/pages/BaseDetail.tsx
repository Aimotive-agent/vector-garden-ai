import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { ChatWindow } from "@/components/ChatWindow";
import { Database, Search, MessageSquare, Upload, FileText, Clock, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface VectorBase {
  id: string;
  name: string;
  created_at: string;
}

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  chunk_count: number;
  uploaded_at: string;
}

interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
}

const BaseDetail = () => {
  const { id } = useParams();
  const [vectorBase, setVectorBase] = useState<VectorBase | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadVectorBase();
      loadDocuments();
    }
  }, [id]);

  const loadVectorBase = async () => {
    try {
      const { data, error } = await supabase
        .from("vector_bases")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVectorBase(data);
    } catch (error) {
      console.error("Error loading vector base:", error);
      toast({
        title: "Error",
        description: "Failed to load vector base",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("base_id", id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // Call search edge function
      const { data, error } = await supabase.functions.invoke('search', {
        body: {
          base_id: id,
          query: searchQuery,
          top_k: 5
        }
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching:", error);
      toast({
        title: "Error",
        description: "Search failed. Make sure the search function is deployed.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;
      
      setDocuments(documents.filter(doc => doc.id !== docId));
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploaded":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vector base...</p>
        </div>
      </div>
    );
  }

  if (!vectorBase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Vector Base Not Found</h2>
          <p className="text-muted-foreground mb-4">The vector base you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 gradient-card">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="gradient-primary p-2 rounded-lg">
              <Database className="h-6 w-6 text-primary-foreground" />
            </div>
            <Link to="/" className="text-xl font-bold hover:text-primary transition-colors">
              AI Vector Base
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold">{vectorBase.name}</span>
          </div>
          <Button onClick={() => setShowChat(!showChat)} className="gradient-accent">
            <MessageSquare className="h-4 w-4 mr-2" />
            {showChat ? 'Hide Chat' : 'Open Chat'}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Base Header */}
        <div className="mb-8 gradient-card rounded-2xl p-8 border border-border/50">
          <h1 className="text-4xl font-bold mb-3 gradient-primary bg-clip-text text-transparent">
            {vectorBase.name}
          </h1>
          <p className="text-muted-foreground text-lg">
            Created {new Date(vectorBase.created_at).toLocaleDateString()} • {documents.length} documents
          </p>
        </div>

        <Tabs defaultValue="documents" className="space-y-8">
          <TabsList className="gradient-card border-border/50 p-1">
            <TabsTrigger value="documents" className="flex items-center space-x-2 data-[state=active]:gradient-primary">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center space-x-2 data-[state=active]:gradient-primary">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2 data-[state=active]:gradient-primary">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center space-x-2 data-[state=active]:gradient-primary">
              <Database className="h-4 w-4" />
              <span>Webhooks</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <Card className="gradient-card border-border/50">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Documents</CardTitle>
                    <CardDescription className="text-lg">
                      Manage your uploaded documents and their processing status
                    </CardDescription>
                  </div>
                  <div className="gradient-primary px-4 py-2 rounded-lg">
                    <FileText className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="p-6 rounded-full bg-muted w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">No Documents Yet</h3>
                    <p className="text-muted-foreground text-lg">Upload your first document to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="gradient-card border border-border/50 rounded-xl p-6 transition-all hover:glow-primary">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-lg bg-muted">
                              <FileText className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{doc.file_name}</p>
                              <div className="flex items-center space-x-4 text-muted-foreground">
                                <span>{formatFileSize(doc.file_size || 0)}</span>
                                <span>•</span>
                                <span>{doc.chunk_count || 0} chunks</span>
                                <span>•</span>
                                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(doc.status)}
                              <Badge variant={
                                doc.status === 'ready' ? 'default' : 
                                doc.status === 'error' ? 'destructive' : 
                                'secondary'
                              }>
                                {doc.status}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDocument(doc.id)}
                              className="hover:bg-destructive/20 hover:text-destructive"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search">
            <Card className="gradient-card border-border/50">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Semantic Search</CardTitle>
                    <CardDescription className="text-lg">
                      Search through your documents using natural language queries
                    </CardDescription>
                  </div>
                  <div className="gradient-primary px-4 py-2 rounded-lg">
                    <Search className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex space-x-3">
                  <Textarea
                    placeholder="Enter your search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-h-[120px] bg-muted border-border/50"
                  />
                  <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()} className="gradient-primary px-8">
                    {searching ? (
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Search Results</h3>
                    {searchResults.map((result, index) => (
                      <Card key={result.id} className="gradient-card border-border/50">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <Badge variant="outline" className="gradient-accent">
                              Score: {result.score?.toFixed(3)}
                            </Badge>
                          </div>
                          <p className="text-base leading-relaxed">{result.content}</p>
                          {result.metadata && (
                            <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                              {JSON.stringify(result.metadata)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
            <Card className="gradient-card border-border/50">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Upload Documents</CardTitle>
                    <CardDescription className="text-lg">
                      Upload documents to add them to your vector base
                    </CardDescription>
                  </div>
                  <div className="gradient-primary px-4 py-2 rounded-lg">
                    <Upload className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FileUpload baseId={id!} onUploadComplete={loadDocuments} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <Card className="gradient-card border-border/50">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Webhook Integration</CardTitle>
                    <CardDescription className="text-lg">
                      Connect external services and API endpoints to your vector base
                    </CardDescription>
                  </div>
                  <div className="gradient-accent px-4 py-2 rounded-lg">
                    <Database className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-lg font-semibold mb-3 block">Webhook Configuration</label>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Webhook URL</label>
                          <Input 
                            placeholder="https://your-webhook-url.com/endpoint" 
                            className="mt-2 bg-muted border-border/50"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Secret Key</label>
                          <Input 
                            type="password"
                            placeholder="Optional webhook secret"
                            className="mt-2 bg-muted border-border/50"
                          />
                        </div>
                        <Button className="w-full gradient-accent">
                          Configure Webhook
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-lg font-semibold mb-3 block">API Endpoints</label>
                      <div className="space-y-4">
                        <div className="gradient-card p-4 rounded-lg border border-border/50">
                          <label className="text-sm font-medium text-muted-foreground">GET Documents</label>
                          <code className="block mt-2 text-sm text-foreground break-all">
                            GET /api/vectors/{id}/webhook
                          </code>
                        </div>
                        <div className="gradient-card p-4 rounded-lg border border-border/50">
                          <label className="text-sm font-medium text-muted-foreground">POST Data</label>
                          <code className="block mt-2 text-sm text-foreground break-all">
                            POST /api/vectors/{id}/webhook
                          </code>
                        </div>
                        <Button variant="outline" className="w-full">
                          Test Connection
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border/50 pt-8">
                  <h3 className="text-lg font-semibold mb-4">Recent Webhook Activity</h3>
                  <div className="text-center py-8">
                    <div className="p-4 rounded-full bg-muted w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Database className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No webhook activity yet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Window */}
      {showChat && (
        <ChatWindow baseId={id!} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
};

export default BaseDetail;