export const uploadImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const base64Image = reader.result;
                const response = await fetch("/api/upload", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ image: base64Image }),
                });

                if (!response.ok) {
                    throw new Error("Lỗi upload ảnh");
                }

                const data = await response.json();
                resolve(data.url);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
    });
};