<?php

namespace App\Services;

use App\Mail\IncidentReportReceivedMail;
use App\Mail\IncidentReportStatusChangedMail;
use App\Models\IncidentReport;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class IncidentReportNotificationService
{
    public function sendReceived(IncidentReport $report): void
    {
        if (!$this->canSendToReporter($report)) {
            return;
        }

        try {
            Mail::to($report->reporter_email)->send(new IncidentReportReceivedMail($report));
        } catch (\Throwable $exception) {
            Log::warning('Gagal mengirim email laporan diterima.', [
                'report_id' => $report->id,
                'report_code' => $report->public_code,
                'email' => $report->reporter_email,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function sendStatusChanged(IncidentReport $report): void
    {
        if (!$this->canSendToReporter($report)) {
            return;
        }

        try {
            Mail::to($report->reporter_email)->send(new IncidentReportStatusChangedMail($report, (string) $report->status));
        } catch (\Throwable $exception) {
            Log::warning('Gagal mengirim email perubahan status laporan.', [
                'report_id' => $report->id,
                'report_code' => $report->public_code,
                'status' => $report->status,
                'email' => $report->reporter_email,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function canSendToReporter(IncidentReport $report): bool
    {
        $email = trim((string) $report->reporter_email);

        return $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}
