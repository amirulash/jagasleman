<?php

namespace App\Mail;

use App\Models\IncidentReport;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class IncidentReportReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public IncidentReport $report)
    {
        $this->report->loadMissing('photos');
    }

    public function build(): self
    {
        return $this
            ->subject('Laporan JagaSleman Berhasil Dikirim - ' . $this->report->public_code)
            ->view('emails.incident-reports.received')
            ->with([
                'report' => $this->report,
                'statusUrl' => url('/statistics'),
            ]);
    }
}
