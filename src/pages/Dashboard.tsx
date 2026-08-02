import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, FileText, Clock, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface VectorBase {
  id: string;
  name: string;
  created_at: string;
  _count?: {
    documents: number;
  };
}

const Dashboard = () => {
  const [vectorBases, setVectorBases] = useState<VectorBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadVectorBases();
  }, []);

  const loadVectorBases = async () => {
    try {
      const { data, error } = await supabase
        .from("vector_bases")
        .select(`
          *,
          documents(count)
        `);

      if (error) throw error;

      const basesWithCounts = data.map(base => ({
        ...base,
        _count: {
          documents: base.documents?.length || 0
        }
      }));

      setVectorBases(basesWithCounts);
    } catch (error) {
      console.error("Error loading vector bases:", error);
      toast({
        title: "Error",
        description: "Failed to load vector bases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createVectorBase = async () => {
    if (!newBaseName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("vector_bases")
        .insert({
          name: newBaseName,
          openai_key_encrypted: openaiKey || null,
        })
        .select()
        .single();

      if (error) throw error;

      setVectorBases([...vectorBases, { ...data, _count: { documents: 0 } }]);
      setIsCreateOpen(false);
      setNewBaseName("");
      setOpenaiKey("");
      
      toast({
        title: "Success",
        description: "Vector base created successfully",
      });
    } catch (error) {
      console.error("Error creating vector base:", error);
      toast({
        title: "Error", 
        description: "Failed to create vector base",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Vector Bases</h1>
            <p className="text-muted-foreground">Manage your AI-powered document collections</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Base
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Vector Base</DialogTitle>
                <DialogDescription>
                  Create a new vector base to store and search your documents.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Base Name</Label>
                  <Input
                    id="name"
                    value={newBaseName}
                    onChange={(e) => setNewBaseName(e.target.value)}
                    placeholder="Enter base name..."
                  />
                </div>
                <div>
                  <Label htmlFor="openai-key">DeepSeek API Key (Optional)</Label>
                  <Textarea
                    id="openai-key"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: Add your DeepSeek key to enable embeddings for this base
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createVectorBase}>Create Base</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vector Bases Grid */}
        {vectorBases.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Vector Bases Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first vector base to start storing and searching documents with AI.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Base
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vectorBases.map((base) => (
              <Card key={base.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link to={`/base/${base.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Database className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{base.name}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {base._count?.documents || 0} docs
                      </Badge>
                    </div>
                    <CardDescription>
                      Created {new Date(base.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{base._count?.documents || 0} documents</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Ready</span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;