import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Copy, Trash2, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import bcrypt from "bcryptjs";
import { BrandMark } from "@/components/BrandMark";
import { SignOutButton } from "@/components/SignOutButton";

interface ApiKey {
  id: string;
  label: string;
  created_at: string;
  scopes: unknown;
}

const Settings = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [globalOpenAIKey, setGlobalOpenAIKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    // Generate a random API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'avb_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createApiKey = async () => {
    if (!newKeyLabel.trim()) return;

    try {
      const apiKey = generateApiKey();
      const keyHash = await bcrypt.hash(apiKey, 10);

      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          label: newKeyLabel,
          key_hash: keyHash,
          scopes: []
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys([data, ...apiKeys]);
      setCreatedKey(apiKey);
      setNewKeyLabel("");
      
      toast({
        title: "Success",
        description: "API key created successfully",
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", keyId);

      if (error) throw error;

      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      toast({
        title: "Success",
        description: "API key revoked successfully",
      });
    } catch (error) {
      console.error("Error revoking API key:", error);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BrandMark>
              <span className="text-muted-foreground">/</span>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold">Settings</span>
            </BrandMark>
          </div>
          <nav className="flex items-center space-x-4">
            <SignOutButton />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="space-y-8">
          {/* Global AI Key */}
          <Card>
            <CardHeader>
              <CardTitle>Global DeepSeek API Key</CardTitle>
              <CardDescription>
                Set a default DeepSeek API key for all vector bases that don't have their own key configured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="global-openai-key">DeepSeek API Key</Label>
                <div className="flex space-x-2">
                  <Input
                    id="global-openai-key"
                    type="password"
                    value={globalOpenAIKey}
                    onChange={(e) => setGlobalOpenAIKey(e.target.value)}
                    placeholder="sk-..."
                    className="font-mono"
                  />
                  <Button variant="outline">Save</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This key will be encrypted and stored securely
                </p>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage API keys for programmatic access to your vector bases
                  </CardDescription>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for accessing your vector bases programmatically.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="key-label">Label</Label>
                        <Input
                          id="key-label"
                          value={newKeyLabel}
                          onChange={(e) => setNewKeyLabel(e.target.value)}
                          placeholder="Enter a descriptive label..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createApiKey}>Create Key</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Show created key */}
              {createdKey && (
                <Card className="mb-4 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-800">API Key Created</CardTitle>
                    <CardDescription className="text-green-700">
                      Copy this key now. You won't be able to see it again.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={createdKey}
                        readOnly
                        className="font-mono text-sm bg-white"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(createdKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 text-green-700"
                      onClick={() => setCreatedKey("")}
                    >
                      Dismiss
                    </Button>
                  </CardContent>
                </Card>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading API keys...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first API key to access the API programmatically.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.label}</TableCell>
                        <TableCell className="font-mono text-sm">
                          avb_••••••••••••••••••••••••••••••••
                        </TableCell>
                        <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeApiKey(key.id)}
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
        </div>
      </div>
    </div>
  );
};

export default Settings;