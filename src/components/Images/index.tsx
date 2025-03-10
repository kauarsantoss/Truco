// Importa todas as imagens dentro da pasta assets
const images = import.meta.glob("../../assets/*.png", { eager: true });
console.log("Imagens carregadas:", images);
// Converte o objeto para facilitar o acesso às imagens
const Images = Object.fromEntries(
  Object.entries(images).map(([path, mod]) => [
    path.replace("../../assets/", ""), // Remove "./assets/" do caminho
    mod.default, // Pega o valor correto da imagem
  ])
);

console.log("Imagens formatadas:", Images);

export default Images;