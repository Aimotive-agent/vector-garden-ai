import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { uuid } from "@/utils/uuid";
import { useToast } from "@/hooks/use-toast";
import { Send, X, MessageSquare, Bot, User, Database, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatWindowProps {
  baseId: string;
  onClose: () => void;
}

interface VectorBase {
  id: string;
  name: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatWindow = ({ baseId, onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you search and answer questions about your documents. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [vectorBases, setVectorBases] = useState<VectorBase[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState(baseId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const loadVectorBases = async () => {
      const { data, error } = await supabase
        .from('vector_bases')
        .select('id, name')
        .order('name');
      
      if (data && !error) {
        setVectorBases(data);
      }
    };

    loadVectorBases();
  }, []);

  const handleBaseChange = (newBaseId: string) => {
    setSelectedBaseId(newBaseId);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you search and answer questions about your documents. What would you like to know?',
      timestamp: new Date()
    }]); // Reset chat when switching bases
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuid(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // RAG chat via the homelab edge function (vector retrieval + AI gateway,
      // server-side keys — nothing sensitive in the bundle)
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          base_id: selectedBaseId,
          messages: [
            ...messages.filter(m => m.role !== 'assistant' || m.id === '1'), // Keep system message
            userMessage
          ].map(m => ({ id: m.id, role: m.role, content: m.content }))
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const assistantMessage: Message = {
        id: uuid(),
        role: 'assistant',
        content: data?.response || "I'm sorry, I couldn't process your request at the moment.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: uuid(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request. Please try again shortly.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveToVault = async (content: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('save-to-vault', {
        body: {
          content,
          base_id: selectedBaseId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI response saved to vault successfully!",
      });
    } catch (error) {
      console.error('Save to vault error:', error);
      toast({
        title: "Error",
        description: "Failed to save to vault. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <Card className="w-96 h-[600px] shadow-xl flex flex-col gradient-card border-border/50 glow-primary pointer-events-auto">
        <CardHeader className="flex flex-col space-y-3 pb-3">
          <div className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>AI Chat</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Vector Base:</span>
            </div>
            <Select value={selectedBaseId} onValueChange={handleBaseChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a vector base" />
              </SelectTrigger>
              <SelectContent>
                {vectorBases.map((base) => (
                  <SelectItem key={base.id} value={base.id}>
                    {base.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      
        <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-2">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.id !== '1' && (
                        <div className="flex justify-end pt-2 border-t border-border/20">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveToVault(message.content)}
                            className="h-6 px-2 text-xs"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save to Vault
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-2 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Ask a question about your documents..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};