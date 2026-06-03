<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ExternalNewsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min((int) $request->query('limit', 20), 20);
        $query = 'Sleman kejahatan jalanan pengeroyokan penganiayaan sajam curas pemerasan';
        $url = 'https://news.google.com/rss/search?q=' . urlencode($query) . '&hl=id&gl=ID&ceid=ID:id';

        try {
            $response = Http::timeout(12)
                ->withHeaders(['User-Agent' => 'JagaSleman-WebGIS/1.0'])
                ->get($url);

            if (! $response->successful()) {
                return response()->json(['data' => [], 'message' => 'Sumber berita tidak dapat diakses'], 502);
            }

            $xml = @simplexml_load_string($response->body(), 'SimpleXMLElement', LIBXML_NOCDATA);
            if (! $xml || ! isset($xml->channel->item)) {
                return response()->json(['data' => [], 'message' => 'Format RSS tidak valid'], 502);
            }

            $items = [];
            foreach ($xml->channel->item as $item) {
                $title = (string) $item->title;
                $summary = trim(strip_tags((string) $item->description));
                $publishedAt = (string) $item->pubDate;
                $link = (string) $item->link;
                $source = isset($item->source) ? (string) $item->source : 'Google News';

                $items[] = [
                    'id' => md5($title . $link),
                    'title' => $title,
                    'summary' => Str::limit($summary ?: $title, 240),
                    'category' => $this->classify($title . ' ' . $summary),
                    'date' => $publishedAt ? date('Y-m-d H:i:s', strtotime($publishedAt)) : now()->toDateTimeString(),
                    'source' => $source,
                    'url' => $link,
                ];

                if (count($items) >= $limit) {
                    break;
                }
            }

            return response()->json(['data' => $items]);
        } catch (\Throwable $exception) {
            return response()->json([
                'data' => [],
                'message' => 'Gagal mengambil berita eksternal: ' . $exception->getMessage(),
            ], 500);
        }
    }

    private function classify(string $text): string
    {
        $value = Str::lower($text);

        if (Str::contains($value, ['curas', 'kekerasan', 'begal'])) {
            return 'CURAS';
        }

        if (Str::contains($value, ['sajam', 'senjata tajam', 'clurit', 'celurit'])) {
            return 'SAJAM';
        }

        if (Str::contains($value, ['aniaya', 'penganiayaan'])) {
            return 'PENGANIAYAAN';
        }

        if (Str::contains($value, ['keroyok', 'pengeroyokan'])) {
            return 'PENGEROYOKAN';
        }

        if (Str::contains($value, ['ancaman', 'pemerasan', 'peras'])) {
            return 'PEMERASAN';
        }

        return 'HIMBAUAN';
    }
}
