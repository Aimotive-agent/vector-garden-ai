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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-primary" />
            <Link to="/" className="text-2xl font-bold hover:text-primary transition-colors">
              AI Vector Base
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold">{vectorBase.name}</span>
          </div>
          <Button onClick={() => setShowChat(!showChat)} variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            {showChat ? 'Hide Chat' : 'Open Chat'}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Base Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{vectorBase.name}</h1>
          <p className="text-muted-foreground">
            Created {new Date(vectorBase.created_at).toLocaleDateString()} • {documents.length} documents
          </p>
        </div>

        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Manage your uploaded documents and their processing status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
                    <p className="text-muted-foreground">Upload your first document to get started.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Chunks</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.file_name}</TableCell>
                          <TableCell>{formatFileSize(doc.file_size || 0)}</TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell>{doc.chunk_count || 0}</TableCell>
                          <TableCell>{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDocument(doc.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>Semantic Search</CardTitle>
                <CardDescription>
                  Search through your documents using natural language queries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Enter your search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                    {searching ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Search Results</h3>
                    {searchResults.map((result, index) => (
                      <Card key={result.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline">Score: {result.score?.toFixed(3)}</Badge>
                        </div>
                        <p className="text-sm">{result.content}</p>
                        {result.metadata && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {JSON.stringify(result.metadata)}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload documents to add them to your vector base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload baseId={id!} onUploadComplete={loadDocuments} />
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