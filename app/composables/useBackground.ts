

const useBackground = () => {

  const background = ref({
    background: '',
    'background-size': 'cover',
    'max-width': '100%',
    'height': '100%',
    'position': 'absolute',
    'width': '100%',
    'background-position': 'center center fixed',
    'background-repeat': 'no-repeat',
    'background-attachment': 'fixed',
    'overflow': 'hidden'
  })
  
  const imageUrl = ref()
  
  const random_item = (() => {
    const items = [
      // 'https://images.pexels.com/photos/37098141/pexels-photo-37098141.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      // 'https://images.pexels.com/photos/33197282/pexels-photo-33197282.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      'https://images.pexels.com/photos/10132977/pexels-photo-10132977.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      'https://images.pexels.com/photos/3786748/pexels-photo-3786748.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      'https://images.pexels.com/photos/327882/pexels-photo-327882.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
    ];
    const index = Math.floor(Math.random()*items.length)
    // return 'url(' + items[index] + ') no-repeat center center fixed'
    return items[index]
  })

  const backgroundUrl = ref(random_item())

  const backgroundStyle = computed(() => ({
    backgroundImage: `url('${backgroundUrl.value}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh'
  }))

  return {
    background, imageUrl, random_item, backgroundStyle
  }
}

export default useBackground