<?php

namespace App\Mail;

use App\Models\IncidentReport;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class IncidentReportStatusChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public IncidentReport $report, public string $newStatus)
    {
        $this->report->loadMissing('photos');
    }

    public function build(): self
    {
        return $this
            ->subject('Update Status Laporan JagaSleman - ' . $this->report->public_code)
            ->view('emails.incident-reports.status-changed')
            ->with([
                'report' => $this->report,
                'newStatus' => $this->newStatus,
                'statusUrl' => url('/statistics'),
            ]);
    }
}
