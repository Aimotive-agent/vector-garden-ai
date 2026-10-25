import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { SignOutButton } from "@/components/SignOutButton";

const Docs = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BrandMark>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold">API Documentation</span>
            </BrandMark>
          </div>
          <nav className="flex items-center space-x-4">
            <SignOutButton />
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-8">
          <Book className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">API Documentation</h1>
        </div>

        <div className="space-y-8">
          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                All API requests require authentication using an API key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">API Key Header</h3>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    Authorization: Bearer YOUR_API_KEY
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get your API key from the <Link to="/settings" className="text-primary hover:underline">Settings</Link> page.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Search Endpoint */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>/api/search</CardTitle>
                  <CardDescription>Search through document chunks using semantic similarity</CardDescription>
                </div>
                <Badge>POST</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "base_id": "uuid",
  "query": "What is artificial intelligence?",
  "top_k": 5
}`}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "results": [
    {
      "id": "uuid",
      "content": "Artificial intelligence (AI) is...",
      "metadata": {...},
      "score": 0.89
    }
  ]
}`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Endpoint */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>/api/chat</CardTitle>
                  <CardDescription>Chat with your documents using retrieval-augmented generation</CardDescription>
                </div>
                <Badge>POST</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "base_id": "uuid",
  "messages": [
    {
      "role": "user",
      "content": "What are the main benefits of AI?"
    }
  ]
}`}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response (Streaming)</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`data: {"delta": "Based on the documents..."}
data: {"delta": " AI provides several benefits..."}
data: {"delta": " including automation..."}
data: [DONE]`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create API Key */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>/api/create-api-key</CardTitle>
                  <CardDescription>Create a new API key for programmatic access</CardDescription>
                </div>
                <Badge>POST</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "label": "My App Integration"
}`}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "api_key": "avb_...",
  "id": "uuid",
  "label": "My App Integration"
}`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revoke API Key */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>/api/revoke-api-key</CardTitle>
                  <CardDescription>Revoke an existing API key</CardDescription>
                </div>
                <Badge variant="destructive">POST</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "id": "uuid"
}`}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "success": true,
  "message": "API key revoked successfully"
}`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Responses */}
          <Card>
            <CardHeader>
              <CardTitle>Error Responses</CardTitle>
              <CardDescription>Standard error response format</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Error Format</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  }
}`}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Common Error Codes</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>UNAUTHORIZED</strong> - Invalid or missing API key</li>
                    <li><strong>NOT_FOUND</strong> - Resource not found</li>
                    <li><strong>VALIDATION_ERROR</strong> - Invalid request body</li>
                    <li><strong>RATE_LIMITED</strong> - Too many requests</li>
                    <li><strong>INTERNAL_ERROR</strong> - Server error</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Docs;