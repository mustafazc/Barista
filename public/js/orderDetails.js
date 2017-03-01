$(function () {

var $items = $('#items');
    $.ajax({
        type:'GET',
        url: 'https://momnpopbarista.herokuapp.com/dueorders',
        success: function(orders){

            console.log('success')
            $.each(orders.dueOrders, function(i, orders){

                ($.each(orders.Order, function(i,items){

                        ($.each(items,function(i,product){
                            if(product % 1 === 0 ){
                            //     $items.append('<li>' +product)
                            // // } else if (product.prev() % 1 === 0){
                            // // $items.append( product + " " + '</li>')
                        } else {
                        $items.append('<li>' +product + " " + '</li>')
                            }
                        }))
                        $items.append()
                    }));
                    $items.append()
            })
        }
    }
    );
});
