// Se estiver com Vite:
const images = import.meta.glob("../../assets/*.png", { eager: true, as: 'url' });

const Images = Object.fromEntries(
    Object.entries(images).map(([path, url]) => [
        path.replace("../../assets/", ""),
        url,
    ])
);

export default Images;