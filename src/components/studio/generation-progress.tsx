import React, { useState, useEffect } from 'react';
import { Loader2, Clock, X, CheckCircle, AlertCircle, Upload, Zap, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { GenerationStatus, GenerationProgressProps } from '@/types/ai-image';

export function GenerationProgress({
  status,
  onCancel
}: GenerationProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time based on status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status.startTime && status.status !== 'completed' && status.status !== 'error' && status.status !== 'idle') {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - status.startTime!) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else if (status.status === 'idle') {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status.startTime, status.status]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = (status: GenerationStatus['status']) => {
    switch (status) {
      case 'idle':
        return {
          title: 'Ready',
          description: 'Ready to generate images',
          icon: null,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50'
        };
      case 'validating':
        return {
          title: 'Validating Input',
          description: 'Checking API key and prompt...',
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950'
        };
      case 'uploading':
        return {
          title: 'Uploading References',
          description: 'Uploading reference images to storage...',
          icon: <Upload className="h-4 w-4" />,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-950'
        };
      case 'generating':
        return {
          title: 'Generating Images',
          description: 'AI is creating your images...',
          icon: <Zap className="h-4 w-4 text-yellow-500" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950'
        };
      case 'storing':
        return {
          title: 'Saving Results',
          description: 'Storing generated images...',
          icon: <Save className="h-4 w-4" />,
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-950'
        };
      case 'completed':
        return {
          title: 'Completed',
          description: 'Images generated successfully!',
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-950'
        };
      case 'error':
        return {
          title: 'Error',
          description: status.message || 'An error occurred during generation',
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-950'
        };
    }
  };

  const config = getStatusConfig(status.status);
  const isActive = status.status !== 'idle' && status.status !== 'completed' && status.status !== 'error';
  const showProgress = isActive && status.progress > 0;

  if (status.status === 'idle') {
    return null;
  }

  return (
    <Card className={cn('transition-all duration-300', config.bgColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={config.color}>
              {config.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <CardDescription className="text-sm">
                {config.description}
              </CardDescription>
            </div>
          </div>
          {isActive && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(status.progress)}%</span>
            </div>
            <Progress
              value={status.progress}
              className="w-full"
              aria-label={`Generation progress: ${Math.round(status.progress)}%`}
            />
          </div>
        )}

        {/* Timer and Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Elapsed: {formatTime(elapsedTime)}</span>
            </div>
            {status.status === 'completed' && status.elapsedTime && (
              <div className="text-muted-foreground">
                Total: {formatTime(Math.floor(status.elapsedTime / 1000))}
              </div>
            )}
          </div>
          {isActive && (
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>

        {/* Status-specific information */}
        {status.status === 'generating' && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            💡 <strong>Tip:</strong> Image generation can take 30-120 seconds depending on complexity.
            The AI is carefully crafting each image based on your prompt and reference images.
          </div>
        )}

        {status.status === 'error' && status.message && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <strong>Error Details:</strong> {status.message}
          </div>
        )}

        {status.status === 'completed' && (
          <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 rounded-lg p-3 border border-green-200 dark:border-green-800">
            🎉 Your images have been generated successfully! Check the gallery below to view and download them.
          </div>
        )}
      </CardContent>
    </Card>
  );
}