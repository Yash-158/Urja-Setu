# api/tasks.py
from .models import Report
from .ai_service import run_ai_analysis

def analyze_report_image_task(report_id):
    """
    A function to run AI analysis on a report image in a background thread.
    """
    print(f"Starting background AI analysis for report ID: {report_id}")
    try:
        report = Report.objects.get(id=report_id)
        if report.image:
            # Run the heavy AI processing
            ai_results = run_ai_analysis(report.image.path)
            
            # Update the report with the AI results (excluding priority)
            if ai_results:
                report.ai_classification = ai_results.get('ai_classification')
                report.ai_suggestion = ai_results.get('ai_suggestion')
                report.status = 'Received' # Update status after analysis
                report.save()
                print(f"✅ Successfully analyzed and updated report ID: {report_id}")
            else:
                report.status = 'Received'
                report.ai_classification = 'Manual Review Required'
                report.save()
                print(f"⚠️ AI analysis failed for report ID: {report_id}, status updated for manual review.")
    except Report.DoesNotExist:
        print(f"🚨 Report with ID {report_id} not found for background task.")