import { useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  speakerName: z.string().min(2, "Speaker name is required"),
  duration: z.coerce.number().min(10, "Duration must be at least 10 seconds").max(7200, "Max duration is 2 hours"),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewSession() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      speakerName: "",
      duration: 300,
    },
  });

  const createSession = useCreateSession();

  const onSubmit = (data: FormValues) => {
    createSession.mutate({ data }, {
      onSuccess: (session) => {
        toast({
          title: "Session Initialized",
          description: "Speech analysis protocol engaged.",
        });
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setLocation(`/sessions/${session.id}`);
      },
      onError: (error) => {
        toast({
          title: "Initialization Failed",
          description: "Could not establish session parameters.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card/60 border-primary/20 shadow-[0_0_30px_rgba(0,102,255,0.05)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <CardHeader>
            <CardTitle className="text-2xl font-mono uppercase tracking-wider text-primary flex items-center gap-2">
              <Zap className="w-5 h-5" />
              New Analysis Session
            </CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-xs uppercase tracking-wide">
              Initialize speech protocol parameters for deep-scan analysis
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Session Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Q3 Earnings Pitch" 
                          className="bg-background border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="speakerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Subject Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Commander Shepard" 
                          className="bg-background border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Duration (Seconds)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          className="bg-background border-border/50 focus-visible:border-primary/50 focus-visible:ring-primary/20 font-mono" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={createSession.isPending}
                    className="font-mono uppercase tracking-widest bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all"
                  >
                    {createSession.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      "Engage Analysis"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}