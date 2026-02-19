import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const nombre = searchParams.get("nombre") ?? "Mundo";

    return NextResponse.json({
        mensaje: `¡Hola, ${nombre}!`,
        timestamp: new Date().toISOString(),
    });
}
