import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NavigationBar } from "@/components/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Folder,
  File,
  Image,
  ArrowLeft,
  Eye,
} from "lucide-react";
import {
  listBucketContents,
} from "@/core/functions/explorer-functions";
import { R2ImagePreview } from "@/components/ui/image-preview";
import { formatFileSize } from "@/lib/file-utils";
import * as React from "react";

export const Route = createFileRoute("/explorer")({
  component: ExplorerPage,
});

function ExplorerPage() {
  const [currentPath, setCurrentPath] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);

  // Fetch bucket contents
  const {
    data: bucketData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bucket-contents", currentPath],
    queryFn: () => listBucketContents({ data: { prefix: currentPath, delimiter: "/", maxKeys: 100 } }),
  });

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSelectedFile(null);
  };

  const handleFileClick = (filePath: string) => {
    setSelectedFile(filePath);
  };

  const handleBackClick = () => {
    const pathParts = currentPath.split("/").filter(Boolean);
    pathParts.pop();
    setCurrentPath(pathParts.length > 0 ? pathParts.join("/") + "/" : "");
    setSelectedFile(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              R2 Explorer
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse and preview contents of the image storage bucket
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Browser */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Folder className="h-5 w-5" />
                        File Browser
                      </CardTitle>
                      <CardDescription>
                        Current path: /{currentPath || "root"}
                      </CardDescription>
                    </div>
                    {currentPath && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackClick}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Loading contents...
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-destructive">
                      Failed to load bucket contents
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Folders */}
                      {bucketData?.folders?.map((folder) => (
                        <div
                          key={folder.path}
                          className="group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 hover:border-accent cursor-pointer transition-all duration-200 hover:shadow-sm"
                          onClick={() => handleFolderClick(folder.path)}
                        >
                          <div className="flex items-center gap-3">
                            <Folder className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform duration-200" />
                            <span className="font-medium group-hover:text-foreground transition-colors">{folder.name}</span>
                            <Badge variant="secondary" className="group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">Folder</Badge>
                          </div>
                        </div>
                      ))}

                      {/* Files */}
                      {bucketData?.files?.map((file) => (
                        <div
                          key={file.path}
                          className={`group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 hover:border-accent cursor-pointer transition-all duration-200 hover:shadow-sm ${
                            selectedFile === file.path ? "bg-accent border-accent shadow-sm" : ""
                          }`}
                          onClick={() => handleFileClick(file.path)}
                        >
                          <div className="flex items-center gap-3">
                            {file.isImage ? (
                              <Image className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform duration-200" />
                            ) : (
                              <File className="h-5 w-5 text-gray-500 group-hover:scale-110 transition-transform duration-200" />
                            )}
                            <div>
                              <div className="font-medium group-hover:text-foreground transition-colors">{file.name}</div>
                              <div className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                                {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                              </div>
                            </div>
                            {file.isImage && (
                              <Badge variant="outline" className="group-hover:bg-green-50 group-hover:text-green-700 group-hover:border-green-200 transition-colors">Image</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileClick(file.path);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            {file.isImage ? <Image className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      ))}

                      {(!bucketData?.folders?.length && !bucketData?.files?.length) && (
                        <div className="text-center py-8 text-muted-foreground">
                          No files or folders found
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview
                  </CardTitle>
                  <CardDescription>
                    {selectedFile ? `Viewing: ${selectedFile.split('/').pop()}` : "Select a file to preview"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedFile ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Click on a file to preview its contents
                    </div>
                  ) : (
                    <R2ImagePreview
                      objectKey={selectedFile}
                      bucket="IMAGE_STUDIO_STORAGE"
                      className="w-full"
                      previewClassName="aspect-[4/3]"
                      showFileName={true}
                      showFileSize={true}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats */}
          {bucketData?.success && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {bucketData.folders?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Folders</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {bucketData.files?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Files</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {bucketData.files?.filter(f => f.isImage).length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Images</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {bucketData.duration}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Load Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}