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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Activity,
  Zap,
  Download,
  Database,
  FileText,
} from "lucide-react";
import {
  getExecutionCount,
  exportAnalyticsToR2,
  listR2Exports,
  downloadR2Export,
} from "@/core/functions/analytics-functions";
import * as React from "react";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [exportLoading, setExportLoading] = React.useState(false);
  const [exportMessage, setExportMessage] = React.useState<string | null>(null);

  // Fetch execution count
  const {
    data: countData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["execution-count"],
    queryFn: () => getExecutionCount(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch R2 exports list
  const {
    data: exportsData,
    isLoading: exportsLoading,
    refetch: refetchExports,
  } = useQuery({
    queryKey: ["r2-exports"],
    queryFn: () => listR2Exports(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const count = countData?.success ? countData.count : 0;
  const date = countData?.success
    ? countData.date
    : new Date().toISOString().split("T")[0];
  const exports = exportsData?.success ? exportsData.exports : [];

  const handleExport = async () => {
    setExportLoading(true);
    setExportMessage(null);

    try {
      const result = await exportAnalyticsToR2({ data: date });

      if (result.success) {
        setExportMessage(
          `Successfully exported ${result.executionCount} executions to ${result.filename}`,
        );
        refetchExports(); // Refresh the exports list
      } else {
        setExportMessage(`Export failed: ${result.error}`);
      }
    } catch (error) {
      setExportMessage(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const result = await downloadR2Export({
        data: filename,
      });
      if (result.success) {
        // Create a blob and download
        const blob = new Blob([result.content], { type: result.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(`Download failed: ${result.error}`);
      }
    } catch (error) {
      alert(
        `Download failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Track server function executions and manage R2 exports.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Execution Count Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Executions
              </CardTitle>
              <CardDescription className="text-xs">{date}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : error ? (
                  <span className="text-2xl font-bold text-red-500">Error</span>
                ) : (
                  <span className="text-2xl font-bold">{count}</span>
                )}
                <Badge variant="secondary" className="text-xs">
                  {count === 1 ? "execution" : "executions"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Export Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available Exports
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                {exportsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-2xl font-bold">{exports.length}</span>
                )}
                <Badge variant="secondary" className="text-xs">
                  files
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Export Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Export Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={handleExport}
                disabled={exportLoading}
                size="sm"
                className="w-full"
              >
                {exportLoading ? (
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3 mr-2" />
                )}
                Export Today
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Export Message */}
        {exportMessage && (
          <Alert
            className={`mb-6 ${
              exportMessage.includes("Successfully")
                ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                : "border-red-200 bg-red-50 dark:bg-red-950/20"
            }`}
          >
            <AlertDescription
              className={
                exportMessage.includes("Successfully")
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }
            >
              {exportMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* R2 Files Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              R2 Storage Files
            </CardTitle>
            <CardDescription>
              Previously exported analytics files
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-muted-foreground">
                  Loading exports...
                </span>
              </div>
            ) : exports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No exports found. Create your first export!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exports.map((exportFile: any) => (
                  <div
                    key={exportFile.filename}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {exportFile.filename}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(exportFile.uploaded).toLocaleDateString()} •{" "}
                        {Math.round(exportFile.size / 1024)}KB
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(exportFile.filename)}
                      size="sm"
                      variant="ghost"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
