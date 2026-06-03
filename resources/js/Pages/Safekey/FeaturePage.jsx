import SafekeyLayout from '@/Layouts/SafekeyLayout';
import { Card, CardContent } from '@/Components/Safekey/ui/card';

export default function FeaturePage({ title, description }) {
    return (
        <SafekeyLayout>
            <div className="min-h-[calc(100vh-4rem)] from-primary/95 via-primary to-police p-6">
                <div className="max-w-5xl mx-auto">
                    <Card className="bg-card/95 border-police/40">
                        <CardContent className="p-8">
                            <h1 className="text-3xl font-bold text-police">{title}</h1>
                            <p className="mt-3 text-muted-foreground">{description}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </SafekeyLayout>
    );
}
