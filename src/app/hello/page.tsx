import processMap from "@/app/helpers/generator"


export default function Hello() {
    const map = processMap(3)
    console.log(map)

    return (
        <div>
            <h1>Hello</h1>
            <pre>{JSON.stringify(map, null, 2)}</pre>
        </div>
    )
}