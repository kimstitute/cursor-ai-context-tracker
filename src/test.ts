for (let i = 0; i < 10; i++) {
    console.log("Hello Cursor!");
}

// Test file for File Change Tracker
export function testFunction(): void {
    console.log("Testing TypeScript compilation");
}

export function minmax(numbers: number[]): { min: number; max: number } | null {
    if (numbers.length === 0) {
        return null;
    }

    let min = numbers[0];
    let max = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] < min) {
            min = numbers[i];
        }
        if (numbers[i] > max) {
            max = numbers[i];
        }
    }

    return { min, max };
}

// Example usage
const result = minmax([5, 2, 8, 1, 9, 3]);
if (result) {
    console.log(`Min: ${result.min}, Max: ${result.max}`);
}
