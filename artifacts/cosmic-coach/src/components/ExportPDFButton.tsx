import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface ExportPDFButtonProps {
  targetId: string;
  filename: string;
  disabled?: boolean;
}

export function ExportPDFButton({ targetId, filename, disabled }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    const element = document.getElementById(targetId);
    if (!element) {
      toast({ title: "Export Failed", description: "Could not find the report content.", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    toast({ title: "Generating PDF", description: "Please wait while we assemble your report..." });

    try {
      // Create canvas from element
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#030712", // dark bg match
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate how many pages we need based on scaled height
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      let heightLeft = scaledHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if it overflows
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${filename}.pdf`);
      toast({ title: "Export Complete", description: "Your PDF has been successfully downloaded." });
    } catch (err) {
      console.error(err);
      toast({ title: "Export Failed", description: "An error occurred during PDF generation.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport} 
      disabled={disabled || isExporting}
      className="font-mono text-xs uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10"
    >
      <FileDown className="w-4 h-4 mr-2" />
      {isExporting ? "Exporting..." : "Export PDF"}
    </Button>
  );
}
