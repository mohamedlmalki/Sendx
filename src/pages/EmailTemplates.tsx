import { useState, useEffect, useCallback, useRef } from "react";
import { Mail, Save, RefreshCw, Eye, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAccount } from "@/contexts/AccountContext";
import { cn } from "@/lib/utils";
import { AddImageDialog } from "@/components/AddImageDialog";
import { PreviewDialog } from "@/components/PreviewDialog";

interface EmailTemplate {
  id: string;
  name: string;
  defaultFromName: string;
  fromEmail: string;
  defaultSubject: string;
  defaultHtmlTemplate: string;
  defaultTextTemplate: string;
}

export default function EmailTemplates() {
  const { activeAccount } = useAccount();
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (activeAccount && activeAccount.status === 'connected') {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/email-templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeAccount)
        });
        const data = await response.json();
        const templatesList = data.emailTemplates || [];
        setTemplates(templatesList);
        if (templatesList.length > 0) {
          if (!selectedTemplate || !templatesList.find((t: EmailTemplate) => t.id === selectedTemplate.id)) {
            fetchTemplateDetails(templatesList[0].id);
          }
        } else {
            setSelectedTemplate(null);
        }
      } catch (err) {
        console.error("Failed to fetch templates", err);
        toast({ title: "Error", description: "Could not fetch email templates.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else {
        setTemplates([]);
        setSelectedTemplate(null);
    }
  }, [activeAccount, selectedTemplate]);

  useEffect(() => {
    fetchTemplates();
  }, [activeAccount]);

  const fetchTemplateDetails = async (id: string) => {
    if (!activeAccount) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeAccount)
      });
      const data = await response.json();
      setSelectedTemplate(data.emailTemplate);
    } catch (err) {
      console.error("Failed to fetch template details", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateUpdate = (field: keyof EmailTemplate, value: string) => {
    if (selectedTemplate) {
      setSelectedTemplate({ ...selectedTemplate, [field]: value });
    }
  };

  const handleInsertImage = (htmlToInsert: string) => {
    if (!selectedTemplate || !htmlTextareaRef.current) return;

    const textarea = htmlTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const newText = text.substring(0, start) + htmlToInsert + text.substring(end);
    
    handleTemplateUpdate('defaultHtmlTemplate', newText);
  };

  const handleSaveChanges = async () => {
    if (!selectedTemplate || !activeAccount) return;
    setIsLoading(true);
    try {
      // **FIX:** Send the entire selectedTemplate object as templateData
      await fetch(`/api/email-templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...activeAccount, templateData: selectedTemplate })
      });
      toast({ title: "Success!", description: `Template "${selectedTemplate.name}" has been saved.` });
    } catch(err) {
        toast({ title: "Error", description: "Failed to save the template.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Email Templates</h1>
          <p className="text-muted-foreground">Manage email templates for {activeAccount?.name || 'your account'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Templates
              <Button variant="outline" size="icon" onClick={fetchTemplates} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => fetchTemplateDetails(template.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/30 border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium">{template.name}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {selectedTemplate?.name || "Select a template"}
                <Button onClick={handleSaveChanges} disabled={!selectedTemplate || isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && !selectedTemplate ? (<p>Loading...</p>) : selectedTemplate ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromName">Default From Name</Label>
                      <Input id="fromName" value={selectedTemplate.defaultFromName} onChange={(e) => handleTemplateUpdate('defaultFromName', e.target.value)} />
                    </div>
                     <div>
                      <Label htmlFor="fromEmail">From Email</Label>
                      <Input id="fromEmail" value={selectedTemplate.fromEmail} onChange={(e) => handleTemplateUpdate('fromEmail', e.target.value)} />
                    </div>
                  </div>
                   <div>
                    <Label htmlFor="subject">Default Subject</Label>
                    <Input id="subject" value={selectedTemplate.defaultSubject} onChange={(e) => handleTemplateUpdate('defaultSubject', e.target.value)} />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="html_body">HTML Body</Label>
                      <div className="flex items-center gap-2">
                         <AddImageDialog onInsertImage={handleInsertImage}>
                            <Button variant="outline" size="sm"><ImageIcon className="w-4 h-4 mr-2" /> Add Image</Button>
                         </AddImageDialog>
                         <PreviewDialog htmlContent={selectedTemplate.defaultHtmlTemplate}>
                            <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" /> Preview</Button>
                         </PreviewDialog>
                      </div>
                    </div>
                    <Textarea ref={htmlTextareaRef} id="html_body" value={selectedTemplate.defaultHtmlTemplate} onChange={(e) => handleTemplateUpdate('defaultHtmlTemplate', e.target.value)} className="min-h-[250px] font-mono text-sm" />
                  </div>
                  <div>
                    <Label htmlFor="text_body">Text Body</Label>
                    <Textarea id="text_body" value={selectedTemplate.defaultTextTemplate} onChange={(e) => handleTemplateUpdate('defaultTextTemplate', e.target.value)} className="min-h-[150px] font-mono text-sm" />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <p>{activeAccount?.status === 'connected' ? 'Select a template from the list to begin editing.' : 'Select a connected account to see templates.'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}