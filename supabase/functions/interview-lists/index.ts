// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve (async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response ('ok',{ headers: corsHeaders})
    }
    if (req.method !== 'PATCH') {
      return new Response ('Method not allowed', {status: 405, headers: corsHeaders })  
    }

    // Đây là bug em note ở Example A luôn đó anh: id nên nằm trên path (VD /interview-lists/:id) vì assignment yêu cầu "correct id-in-path usage (not query param)", nhưng ở đây lại lấy id qua searchParams (query param), thường chỉ những thông tin lọc như là thứ tự sắp xếp, range giá... thì mới hay để vào searchParams thui nha anh
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response ('Missing id', { status: 400, headers: corsHeaders})
    }

    // Chỗ này có mấy vấn đề á anh:
    // 1. `.from('interview list')` tên bảng có khoảng trắng, nên query này sẽ fail ngay.
    // 2. `.select('id')` rồi mới `.update(...)` - thứ tự bị ngược, `.select()` trả về 1 builder khác không có `.update()`, nên dòng này rất dễ dính error trước khi chạy tới được `if (error)`. Muốn vừa update vừa lấy lại row thì phải là `.update({...}).eq(...).select()` - `.select()` đứng SAU `.update()` nha anh.
    const body = await req.json()
    const { data, error} = await supabase
    .from('interview list')
    .select ('id')
    .update ({ status: 'completed' })
    .eq('id', id)

    if (error){
      return new Response (error.message, { status: 500,
        headers: corsHeaders })
    }
    // Cái dụ này (không có `.select()` sau `.update()`) Postgrest sẽ trả `data: null` bất kể update có match được row hay không nha anh, nên `if (!data)` này sẽ luôn đúng, tức là mỗi lần update thành công vẫn bị trả về 404.

    if (!data) {
      return new Response('Data not found', { status: 404, headers: corsHeaders })
    }
    return new Response(JSON.stringify (data),
    {status: 200,
    headers: {... corsHeaders, 'Content-Type': 'application/json'},
    })
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/interview-lists' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/

/*
1. The endpoint path and method
	1. Path: http://127.0.0.1:54321/functions/v1/interview-lists?=1
	// [Nam] Path này đang là query param (với lại `?=1` còn thiếu tên key, phải là `?id=1` mới đúng cú pháp query string). Theo assignment thì id phải nằm trên path, VD `/interview-lists/:id`, để match với route Part 2 yêu cầu.
	2. Method: PATCH
2. What the request body or URL params contain
	1. id của interview trong interview list
	2. {status (body.status)} body của interview list
3. What the server needs to do, step by step
	1. Gửi request OPTIONS, nếu database phản hồi OK (tức là có phản hồi từ phía database) -> chuyển sang bước 2
	2. Kiểm tra request method:
		1. nếu không phải là PATCH thì render error 405 Method not allowed
		2. nếu là PATCH thì sang bước 3
	3. Lấy URL endpoint path, sau đó lấy id của interview từ Params
		1. nếu request id không được khai trong database thì render error 400 Missing id
		2. nếu request id có trong database, chờ thực hiện tiếp request json body fetch data từ supabase
	4. lựa chọn id từ interview list và update status: complete, nếu thỏa mãn điều kiện id được chọn phải giống id lấy từ url
		1. nếu lỗi chung thì render error message 500
		2. nếu lỗi thiếu data thì render 404 Data not found
	5. return body (interview list) với interview được highlight đánh dấu complete
4. What it returns on success and on failure
	1.  Success: 
		1. status: 200, body (interview list) update highlight interview với status completed
	2. on failure
		1. status 500: lỗi chung
		2. status 400: gọi id chưa có trong database
		3. status 404: data không tìm thấy trong database
*/